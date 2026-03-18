import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  ref,
  type App,
  type EffectScope,
} from "vue";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  SWRVConfig,
  createSWRVClient,
  mutate,
  preload,
  useSWRV,
  useSWRVConfig,
  useSWRVImmutable,
  useSWRVInfinite,
  useSWRVMutation,
  useSWRVSubscription,
} from "../src";
import { serialize } from "../src/_internal";
import type { SWRVMiddleware } from "../src";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

async function settle(iterations = 3) {
  for (let index = 0; index < iterations; index += 1) {
    await flush();
  }
}

async function waitForMacrotask() {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await nextTick();
}

const scopes: EffectScope[] = [];
const apps: App[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
  vi.useRealTimers();

  while (scopes.length > 0) {
    scopes.pop()?.stop();
  }

  while (apps.length > 0) {
    apps.pop()?.unmount();
  }

  while (containers.length > 0) {
    containers.pop()?.remove();
  }
});

function runComposable<T>(factory: () => T) {
  let value!: T;
  const scope = effectScope();
  scopes.push(scope);
  scope.run(() => {
    value = factory();
  });
  return value;
}

function mountWithClient(client: ReturnType<typeof createSWRVClient>, key: string) {
  let state!: ReturnType<typeof useSWRV<string>>;

  const Child = defineComponent({
    setup() {
      state = useSWRV<string>(key);
      return () => h("div", state.data.value ?? "");
    },
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);

  const app = createApp({
    render: () =>
      h(
        SWRVConfig,
        { value: { client } },
        {
          default: () => h(Child),
        },
      ),
  });

  apps.push(app);
  app.mount(container);

  return () => state;
}

function mountWithConfig<T>(factory: () => T, config?: Record<string, unknown>) {
  let value!: T;

  const Child = defineComponent({
    setup() {
      value = factory();
      return () => h("div");
    },
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);

  const app = createApp({
    render: () =>
      h(
        SWRVConfig,
        { value: config },
        {
          default: () => h(Child),
        },
      ),
  });

  apps.push(app);
  app.mount(container);

  return () => value;
}

function mockVisibilityState(state: DocumentVisibilityState) {
  const descriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });

  return () => {
    if (descriptor) {
      Object.defineProperty(document, "visibilityState", descriptor);
      return;
    }

    Reflect.deleteProperty(document, "visibilityState");
  };
}

describe("swrv", () => {
  const createLoggerMiddleware = (id: number, keys: Array<{ id: number; key: unknown }>) =>
    ((useSWRVNext) => (key, fetcher, config) => {
      keys.push({ id, key });
      return useSWRVNext(key, fetcher, config);
    }) satisfies SWRVMiddleware;

  it("dedupes concurrent requests for the same key", async () => {
    const key = "dedupe-key";
    const fetcher = vi.fn(async (...args: readonly unknown[]) => `data:${String(args[0])}`);

    const first = runComposable(() => useSWRV<string>(key, fetcher));
    const second = runComposable(() => useSWRV<string>(key, fetcher));

    await flush();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first.data.value).toBe("data:dedupe-key");
    expect(second.data.value).toBe("data:dedupe-key");
  });

  it("dedupes preload requests and reuses them for the first hook fetch", async () => {
    const key = `preload-dedupe-${Date.now()}`;
    let resolveValue!: (value: string) => void;
    const fetcher = vi.fn(
      async (...args: readonly unknown[]) =>
        await new Promise<string>((resolve) => {
          resolveValue = (value) => {
            resolve(`${value}:${String(args[0])}`);
          };
        }),
    );

    const firstPreload = preload(key, fetcher);
    const secondPreload = preload(key, fetcher);
    const state = runComposable(() => useSWRV<string>(key, fetcher, { dedupingInterval: 0 }));

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveValue("seed");
    await expect(firstPreload).resolves.toBe(`seed:${key}`);
    await expect(secondPreload).resolves.toBe(`seed:${key}`);
    await settle();

    expect(state.data.value).toBe(`seed:${key}`);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("clears failed preload entries so a later preload can retry", async () => {
    const key = `preload-error-${Date.now()}`;
    let attempts = 0;
    const fetcher = vi.fn(async (_key: string) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("boom");
      }

      return "ok";
    });

    await expect(preload(key, fetcher)).rejects.toThrow("boom");
    await expect(preload(key, fetcher)).resolves.toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("passes resolved function keys through preload fetchers", async () => {
    const key = `preload-function-${Date.now()}`;
    const fetcher = vi.fn(
      async (...args: readonly unknown[]) => `${String(args[0])}:${String(args[1])}`,
    );

    await expect(preload(() => [key, 1] as const, fetcher)).resolves.toBe(`${key}:1`);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(key, 1);
  });

  it("keeps provider clients isolated", async () => {
    const key = "provider-isolation";
    const clientA = createSWRVClient();
    const clientB = createSWRVClient();

    const stateA = mountWithClient(clientA, key);
    const stateB = mountWithClient(clientB, key);

    const [serializedKey] = serialize(key);
    clientA.setState(
      serializedKey,
      {
        data: "alpha",
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      0,
      key,
    );

    await flush();

    expect(stateA().data.value).toBe("alpha");
    expect(stateB().data.value).toBeUndefined();
  });

  it("applies optimistic mutation updates before the remote value resolves", async () => {
    const key = `optimistic-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<string>(key, async (...args: readonly unknown[]) => `remote:${String(args[0])}`),
    );

    await flush();
    expect(state.data.value).toBe(`remote:${key}`);

    let resolveValue!: (value: string) => void;
    const mutationPromise = mutate<string>(
      key,
      new Promise<string>((resolve) => {
        resolveValue = resolve;
      }),
      {
        optimisticData: "optimistic",
        revalidate: false,
      },
    ) as Promise<string | undefined>;

    await flush();
    expect(state.data.value).toBe("optimistic");

    resolveValue("server");
    await mutationPromise;
    await flush();

    expect(state.data.value).toBe("server");
  });

  it("does not rollback optimistic bound mutations when rollbackOnError is false", async () => {
    const key = `rollback-disabled-${Date.now()}`;
    let value = 0;

    const state = runComposable(() =>
      useSWRV<number | string>(key, async () => value++, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    let rejectMutation!: (reason?: unknown) => void;
    const mutationPromise = state.mutate(
      new Promise<string>((_resolve, reject) => {
        rejectMutation = reject;
      }),
      {
        optimisticData: "optimistic",
        rollbackOnError: false,
      },
    );

    await flush();
    expect(state.data.value).toBe("optimistic");

    rejectMutation(new Error("boom"));
    await expect(mutationPromise).rejects.toThrow("boom");
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("passes the committed snapshot to bound mutate populateCache transforms", async () => {
    const key = `bound-populate-transform-${Date.now()}`;
    const serverData = ["Apple", "Banana"];

    const state = runComposable(() =>
      useSWRV<string[]>(key, async () => [...serverData], {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toEqual(["Apple", "Banana"]);

    let resolveMutation!: (value: string) => void;
    const mutationPromise = state.mutate(
      new Promise<string>((resolve) => {
        resolveMutation = resolve;
      }),
      {
        optimisticData: (currentData) => [...(currentData ?? []), "cherry (optimistic)"],
        populateCache: (result, currentData) => [...(currentData ?? []), `${result} (res)`],
        revalidate: false,
      },
    );

    await flush();
    expect(state.data.value).toEqual(["Apple", "Banana", "cherry (optimistic)"]);

    resolveMutation("Cherry");
    await expect(mutationPromise).resolves.toBe("Cherry");
    await settle();

    expect(state.data.value).toEqual(["Apple", "Banana", "Cherry (res)"]);
  });

  it("supports function revalidate in bound mutate options", async () => {
    const key = `bound-revalidate-fn-${Date.now()}`;
    let value = 0;
    const fetcher = vi.fn(async () => value++);

    const state = runComposable(() =>
      useSWRV<number>(key, fetcher, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const revalidate = (data: number | undefined, currentKey: unknown) =>
      currentKey === key && data === 200;

    await state.mutate(100, { revalidate });
    await settle();

    expect(state.data.value).toBe(100);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await state.mutate(200, { revalidate });
    await settle();

    expect(state.data.value).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("supports function revalidate with mutate key filters", async () => {
    const key1 = `filter-revalidate-1-${Date.now()}`;
    const key2 = `filter-revalidate-2-${Date.now()}`;
    const key3 = `filter-revalidate-3-${Date.now()}`;

    let mockData = {
      [key1]: "page1",
      [key2]: "page2",
      [key3]: "page3",
    };

    const state1 = runComposable(() =>
      useSWRV<string>(key1, async () => mockData[key1], {
        dedupingInterval: 0,
      }),
    );
    const state2 = runComposable(() =>
      useSWRV<string>(key2, async () => mockData[key2], {
        dedupingInterval: 0,
      }),
    );
    const state3 = runComposable(() =>
      useSWRV<string>(key3, async () => mockData[key3], {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state1.data.value).toBe("page1");
    expect(state2.data.value).toBe("page2");
    expect(state3.data.value).toBe("page3");

    mockData = {
      [key1]: "<page1>",
      [key2]: "<page2>",
      [key3]: "<page3>",
    };

    await mutate((currentKey) => currentKey !== key1, "updated", {
      revalidate: (data, currentKey) => data === "updated" && currentKey === key3,
    });
    await settle();

    expect(state1.data.value).toBe("page1");
    expect(state2.data.value).toBe("updated");
    expect(state3.data.value).toBe("<page3>");
  });

  it("skips internal infinite and subscription cache keys when mutating with a filter", async () => {
    const key = `filter-skip-internal-${Date.now()}`;
    const seenKeys: unknown[] = [];

    runComposable(() => useSWRV<string>(key, async () => "root"));
    runComposable(() =>
      useSWRVInfinite<string>(
        (index) => [key, "page", index] as const,
        async (...args: readonly unknown[]) => args.map(String).join(":"),
        { initialSize: 2 },
      ),
    );
    runComposable(() =>
      useSWRVSubscription<string, Error>(key, (_resolvedKey, { next }) => {
        next(undefined, "subscription");
        return () => {};
      }),
    );

    await settle(6);

    await mutate((currentKey) => {
      seenKeys.push(currentKey);
      return false;
    });

    expect(seenKeys).toContain(key);
    expect(
      seenKeys.some(
        (currentKey) => typeof currentKey === "string" && currentKey.startsWith("$inf$"),
      ),
    ).toBe(false);
    expect(
      seenKeys.some(
        (currentKey) => typeof currentKey === "string" && currentKey.startsWith("$sub$"),
      ),
    ).toBe(false);
  });

  it("loads and expands infinite pages", async () => {
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => ["page", index] as const,
        async (...args) => args.join(":"),
        { initialSize: 2 },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["page:0", "page:1"]);

    await state.setSize(3);
    await settle();

    expect(state.data.value).toEqual(["page:0", "page:1", "page:2"]);
  });

  it("supports cursor-based infinite loading", async () => {
    const state = runComposable(() =>
      useSWRVInfinite<Array<{ data: string; id: number }>>(
        (index, previousPageData) => {
          if (index === 0) {
            return "/api/items";
          }

          if (!previousPageData?.length) {
            return null;
          }

          return `/api/items?offset=${previousPageData[previousPageData.length - 1].id}`;
        },
        async (...args: readonly unknown[]) => {
          const url = String(args[0]);
          const parse = url.match(/\?offset=(\d+)/);
          const offset = parse ? Number(parse[1]) + 1 : 0;

          return offset <= 3
            ? [
                { data: "foo", id: offset },
                { data: "bar", id: offset + 1 },
              ]
            : [];
        },
        { initialSize: 5 },
      ),
    );

    await settle(8);

    expect(state.data.value).toEqual([
      [
        { data: "foo", id: 0 },
        { data: "bar", id: 1 },
      ],
      [
        { data: "foo", id: 2 },
        { data: "bar", id: 3 },
      ],
      [],
    ]);
  });

  it("reuses preloaded page requests in useSWRVInfinite", async () => {
    const key = `infinite-preload-${Date.now()}`;
    const fetcher = vi.fn(
      async (...args: readonly unknown[]) => `${String(args[0])}:${String(args[1])}`,
    );

    await expect(preload([key, 0] as const, fetcher)).resolves.toBe(`${key}:0`);

    const state = runComposable(() =>
      useSWRVInfinite<string>((index) => [key, index] as const, fetcher, { dedupingInterval: 0 }),
    );

    await settle();

    expect(state.data.value).toEqual([`${key}:0`]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reuses multiple preloaded page requests in parallel mode", async () => {
    const key = `infinite-preload-parallel-${Date.now()}`;
    const fetcher = vi.fn(
      async (...args: readonly unknown[]) => `${String(args[0])}:${String(args[1])}`,
    );

    await Promise.all([
      preload([key, 0] as const, fetcher),
      preload([key, 1] as const, fetcher),
      preload([key, 2] as const, fetcher),
    ]);

    const state = runComposable(() =>
      useSWRVInfinite<string>((index) => [key, index] as const, fetcher, {
        dedupingInterval: 0,
        initialSize: 3,
        parallel: true,
      }),
    );

    await settle(6);

    expect(state.data.value).toEqual([`${key}:0`, `${key}:1`, `${key}:2`]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("revalidates the first page and fetches only the new page when size grows", async () => {
    let requests = 0;
    const key = `infinite-requests-${Date.now()}`;

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => [key, index] as const,
        async (...args: readonly unknown[]) => {
          requests += 1;
          return `page ${String(args[1])}, `;
        },
      ),
    );

    await settle();
    expect(requests).toBe(1);
    expect(state.data.value).toEqual(["page 0, "]);

    await state.setSize(2);
    await settle();

    expect(requests).toBe(3);
    expect(state.data.value).toEqual(["page 0, ", "page 1, "]);

    await state.setSize(3);
    await settle();

    expect(requests).toBe(5);
    expect(state.data.value).toEqual(["page 0, ", "page 1, ", "page 2, "]);
  });

  it("does not revalidate the first page when revalidateFirstPage is false", async () => {
    let requests = 0;
    const key = `infinite-no-first-page-${Date.now()}`;

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => [key, index] as const,
        async (...args: readonly unknown[]) => {
          requests += 1;
          return `page ${String(args[1])}, `;
        },
        {
          revalidateFirstPage: false,
        },
      ),
    );

    await settle();
    expect(requests).toBe(1);
    expect(state.data.value).toEqual(["page 0, "]);

    await state.setSize(2);
    await settle();

    expect(requests).toBe(2);
    expect(state.data.value).toEqual(["page 0, ", "page 1, "]);
  });

  it("revalidates all loaded pages when infinite mutate() is called without data", async () => {
    const pageData = ["apple", "banana", "pineapple"];
    const key = `infinite-mutate-${Date.now()}`;

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => [key, index] as const,
        async (...args: readonly unknown[]) => `${pageData[Number(args[1])]}, `,
        { initialSize: 3 },
      ),
    );

    await settle(6);
    expect(state.data.value).toEqual(["apple, ", "banana, ", "pineapple, "]);

    pageData[1] = "watermelon";
    await state.mutate();
    await settle(6);

    expect(state.data.value).toEqual(["apple, ", "watermelon, ", "pineapple, "]);
  });

  it("supports page-selective revalidation in infinite bound mutate", async () => {
    let pageData = ["apple", "banana", "pineapple"];
    const key = `infinite-selective-${Date.now()}`;

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => [key, index] as const,
        async (...args: readonly unknown[]) => pageData[Number(args[1])],
        { initialSize: 3 },
      ),
    );

    await settle(6);
    expect(state.data.value).toEqual(["apple", "banana", "pineapple"]);

    pageData = pageData.map((value) => `[${value}]`);
    await state.mutate(state.data.value, {
      revalidate: (page, pageKey) =>
        page === "apple" || (Array.isArray(pageKey) && pageKey[1] === 2),
    });
    await settle(6);

    expect(state.data.value).toEqual(["[apple]", "banana", "[pineapple]"]);
  });

  it("revalidates infinite resources when bound mutate receives object options", async () => {
    let value = 0;
    const key = `infinite-mutate-options-${Date.now()}`;
    const fetcher = vi.fn(async () => `foo-${value++}`);

    const state = runComposable(() =>
      useSWRVInfinite<string>((index) => (index === 0 ? key : null), fetcher, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    await state.mutate(state.data.value, { revalidate: true });
    await settle();

    expect(state.data.value).toEqual(["foo-1"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not revalidate infinite resources when bound mutate disables revalidation", async () => {
    let value = 0;
    const key = `infinite-mutate-no-revalidate-${Date.now()}`;
    const fetcher = vi.fn(async () => `foo-${value++}`);

    const state = runComposable(() =>
      useSWRVInfinite<string>((index) => (index === 0 ? key : null), fetcher, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    await state.mutate(state.data.value, { revalidate: false });
    await settle();

    expect(state.data.value).toEqual(["foo-0"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not throw when infinite getKey is not ready and mutate() is called", async () => {
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        () => {
          throw new Error("not ready");
        },
        async (...args: readonly unknown[]) => `data:${String(args[0])}`,
      ),
    );

    await settle();

    expect(state.data.value).toBeUndefined();
    await expect(state.mutate()).resolves.toBeUndefined();
  });

  it("passes null as previousPageData when parallel mode is enabled", async () => {
    const previousPageDataLogs: Array<string | null> = [];

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index, previousPageData) => {
          previousPageDataLogs.push(previousPageData);
          return ["parallel", index] as const;
        },
        async (...args: readonly unknown[]) => `page ${String(args[1])}`,
        {
          initialSize: 3,
          parallel: true,
        },
      ),
    );

    await settle(6);

    expect(state.data.value).toEqual(["page 0", "page 1", "page 2"]);
    expect(previousPageDataLogs.every((value) => value === null)).toBe(true);
  });

  it("persists page size when the infinite key changes", async () => {
    const key = `infinite-persist-size-${Date.now()}`;
    const toggle = ref(false);

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => [key, index, toggle.value ? "A" : "B"] as const,
        async (...args: readonly unknown[]) => `${String(args[2])}:${String(args[1])}`,
        {
          persistSize: true,
        },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["B:0"]);

    await state.setSize(2);
    await settle();
    expect(state.size.value).toBe(2);
    expect(state.data.value).toEqual(["B:0", "B:1"]);

    toggle.value = true;
    await settle(6);

    expect(state.size.value).toBe(2);
    expect(state.data.value).toEqual(["A:0", "A:1"]);
  });

  it("supports callback-style setSize updates", async () => {
    const key = `infinite-set-size-callback-${Date.now()}`;

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => `${key}-${index}`,
        async (...args: readonly unknown[]) => `page-${String(args[0])}`,
      ),
    );

    await settle();
    expect(state.size.value).toBe(1);
    expect(state.data.value).toEqual([`page-${key}-0`]);

    await state.setSize((size) => size + 1);
    await settle();
    expect(state.size.value).toBe(2);
    expect(state.data.value).toEqual([`page-${key}-0`, `page-${key}-1`]);

    await state.setSize((size) => size + 1);
    await settle();
    expect(state.size.value).toBe(3);
    expect(state.data.value).toEqual([`page-${key}-0`, `page-${key}-1`, `page-${key}-2`]);
  });

  it("uses cached page data immediately while revalidating infinite size growth in the background", async () => {
    vi.useFakeTimers();

    const key = `infinite-cached-page-${Date.now()}`;
    const client = createSWRVClient();
    const fetcher = vi.fn(
      async (..._args: readonly unknown[]) =>
        await new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve("response value");
          }, 30);
        }),
    );

    client.setState<string, Error>(
      `${key}-1`,
      {
        data: "cached value",
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      0,
      `${key}-1`,
    );

    const state = mountWithConfig(
      () => useSWRVInfinite<string>((index) => `${key}-${index}`, fetcher),
      { client },
    );

    await flush();
    await vi.advanceTimersByTimeAsync(30);
    await settle();

    expect(state().data.value).toEqual(["response value"]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const setSizePromise = state().setSize(2);
    await flush();

    expect(state().data.value).toEqual(["response value", "cached value"]);
    expect(fetcher).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(30);
    await setSizePromise;
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("supports mutation hooks updating cache when populateCache is enabled", async () => {
    const key = `mutation-${Date.now()}`;
    const swrv = runComposable(() => useSWRV<string>(key));
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string>(key, async (_key, { arg }) => arg),
    );

    await mutation.trigger("updated", {
      populateCache: true,
    });
    await flush();

    expect(mutation.data.value).toBe("updated");
    expect(swrv.data.value).toBe("updated");
  });

  it("passes the current cached value to mutation populateCache transforms", async () => {
    const key = `mutation-populate-transform-${Date.now()}`;
    const swrv = runComposable(() => useSWRV<string>(key));
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string>(key, async (_key, { arg }) => arg),
    );

    await swrv.mutate("current", { revalidate: false });
    await mutation.trigger("next", {
      populateCache: (result, current) => `${current}:${result}`,
      revalidate: false,
    });
    await settle();

    expect(mutation.data.value).toBe("next");
    expect(swrv.data.value).toBe("current:next");
  });

  it("does not throw mutation errors when throwOnError is false", async () => {
    const key = `mutation-no-throw-${Date.now()}`;
    const onError = vi.fn();

    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        key,
        async () => {
          throw new Error("boom");
        },
        {
          onError,
          throwOnError: false,
        },
      ),
    );

    await expect(mutation.trigger(undefined)).resolves.toBeUndefined();
    expect(mutation.error.value).toBeInstanceOf(Error);
    expect(mutation.error.value?.message).toBe("boom");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("supports function revalidate in mutation trigger options", async () => {
    const key = `mutation-revalidate-fn-${Date.now()}`;
    let value = 0;
    const fetcher = vi.fn(async () => ++value);

    const swrv = runComposable(() =>
      useSWRV<number>(key, fetcher, {
        dedupingInterval: 0,
      }),
    );
    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, void, string>(key, async () => {
        value += 10;
        return value;
      }),
    );

    await settle();
    expect(swrv.data.value).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const options: NonNullable<Parameters<typeof mutation.trigger>[1]> = {
      populateCache: true,
      revalidate: (data, currentKey) => currentKey === key && (data ?? 0) < 30,
    };

    await mutation.trigger(undefined, options);
    await settle();
    expect(swrv.data.value).toBe(12);
    expect(fetcher).toHaveBeenCalledTimes(2);

    await mutation.trigger(undefined, options);
    await settle();
    expect(swrv.data.value).toBe(23);
    expect(fetcher).toHaveBeenCalledTimes(3);

    await mutation.trigger(undefined, options);
    await settle();
    expect(swrv.data.value).toBe(33);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("can reset mutation-local state", async () => {
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>("mutation-reset", async () => "updated"),
    );

    await mutation.trigger(undefined);
    await settle();

    expect(mutation.data.value).toBe("updated");

    mutation.reset();

    expect(mutation.data.value).toBeUndefined();
    expect(mutation.error.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(false);
  });

  it("ignores stale mutation results after reset()", async () => {
    let resolveMutation!: (value: string) => void;
    const onSuccess = vi.fn();

    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        "mutation-reset-race",
        async () =>
          await new Promise<string>((resolve) => {
            resolveMutation = resolve;
          }),
      ),
    );

    const resultPromise = mutation.trigger(undefined, { onSuccess });
    await flush();

    mutation.reset();
    resolveMutation("updated");
    await settle();

    await expect(resultPromise).resolves.toBe("updated");
    expect(mutation.data.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("keeps only the latest mutation result when triggered multiple times", async () => {
    const resolvers = new Map<number, (value: number) => void>();

    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, number>(
        "mutation-race",
        async (_key, { arg }) =>
          await new Promise<number>((resolve) => {
            resolvers.set(arg, resolve);
          }),
      ),
    );

    const first = mutation.trigger(0);
    const second = mutation.trigger(1);
    const third = mutation.trigger(2);
    await flush();

    resolvers.get(0)?.(0);
    await settle();
    expect(mutation.data.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(true);

    resolvers.get(1)?.(1);
    await settle();
    expect(mutation.data.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(true);

    resolvers.get(2)?.(2);
    await settle();

    await expect(first).resolves.toBe(0);
    await expect(second).resolves.toBe(1);
    await expect(third).resolves.toBe(2);
    expect(mutation.data.value).toBe(2);
    expect(mutation.isMutating.value).toBe(false);
  });

  it("throws when triggering a mutation without a fetcher", async () => {
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>("missing-fetcher", null),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("missing fetcher");
  });

  it("receives subscription pushes and cleans up on scope dispose", async () => {
    const key = `subscription-${Date.now()}`;
    let nextValue!: (error?: Error | null, data?: string) => void;
    let disposed = false;

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(key, (_resolvedKey, { next }) => {
        nextValue = next;
        return () => {
          disposed = true;
        };
      }),
    );

    nextValue(null, "live");
    await flush();

    expect(subscription.data.value).toBe("live");

    scopes.pop()?.stop();
    expect(disposed).toBe(true);
  });

  it("supports fallback data and preserves data when subscription emits an error", async () => {
    let nextValue!: (error?: Error | null, data?: string) => void;

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(
        `subscription-fallback-${Date.now()}`,
        (_resolvedKey, { next }) => {
          nextValue = next;
          return () => {};
        },
        {
          fallbackData: "fallback",
        },
      ),
    );

    await settle();
    expect(subscription.data.value).toBe("fallback");
    expect(subscription.error.value).toBeUndefined();

    nextValue(undefined, "live");
    await settle();
    expect(subscription.data.value).toBe("live");
    expect(subscription.error.value).toBeUndefined();

    nextValue(new Error("boom"));
    await settle();
    expect(subscription.data.value).toBe("live");
    expect(subscription.error.value?.message).toBe("boom");

    nextValue(undefined, "recovered");
    await settle();
    expect(subscription.data.value).toBe("recovered");
    expect(subscription.error.value).toBeUndefined();
  });

  it("passes the original key shape to subscription handlers", async () => {
    const originalKeys: Array<readonly string[]> = [];
    const swrKey = `subscription-key-${Date.now()}`;
    const key = [swrKey] as const;

    runComposable(() =>
      useSWRVSubscription<string, Error>(
        () => key,
        (resolvedKey, { next }) => {
          const tupleKey = resolvedKey as typeof key;
          originalKeys.push(tupleKey);
          next(undefined, `${tupleKey[0]}:ok`);
          return () => {};
        },
      ),
    );

    await settle();

    expect(originalKeys).toEqual([[swrKey]]);
  });

  it("deduplicates subscriptions within the same cache boundary", async () => {
    let subscriptionCount = 0;
    const key = `subscription-dedupe-${Date.now()}`;

    runComposable(() => {
      useSWRVSubscription(key, (_key, { next }) => {
        subscriptionCount += 1;
        next(undefined, "one");
        return () => {};
      });
      useSWRVSubscription(key, (_key, { next }) => {
        next(undefined, "two");
        return () => {};
      });
      useSWRVSubscription(key, (_key, { next }) => {
        next(undefined, "three");
        return () => {};
      });
    });

    await settle();

    expect(subscriptionCount).toBe(1);
  });

  it("supports updating subscription keys without subscribing to undefined", async () => {
    const swrKey = `subscription-update-${Date.now()}`;
    const seenKeys: string[] = [];
    const key = ref<string | undefined>(undefined);

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(
        () => key.value,
        (resolvedKey, { next }) => {
          seenKeys.push(resolvedKey as string);
          next(undefined, resolvedKey as string);
          return () => {};
        },
        {
          fallbackData: "fallback",
        },
      ),
    );

    await settle();
    expect(subscription.data.value).toBe("fallback");
    expect(seenKeys).toEqual([]);

    key.value = swrKey;
    await settle();

    expect(subscription.data.value).toBe(swrKey);
    expect(seenKeys).toEqual([swrKey]);
  });

  it("does not conflict with normal useSWRV state for the same logical key", async () => {
    const key = `subscription-isolation-${Date.now()}`;
    let nextValue!: (error?: Error | null, data?: string) => void;

    const swrv = runComposable(() => useSWRV(key, async () => "swr"));
    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(key, (_resolvedKey, { next }) => {
        nextValue = next;
        return () => {};
      }),
    );

    await settle();
    expect(swrv.data.value).toBe("swr");

    nextValue(undefined, "sub");
    await settle();

    expect(subscription.data.value).toBe("sub");
    expect(swrv.data.value).toBe("swr");
  });

  it("requires subscriptions to return a dispose function", () => {
    expect(() =>
      runComposable(() =>
        useSWRVSubscription<string, Error>(
          `subscription-dispose-${Date.now()}`,
          () => "no-dispose" as unknown as () => void,
        ),
      ),
    ).toThrow("must return a function");
  });

  it("does not fetch on the initial mount when revalidateOnMount is false", async () => {
    const fetcher = vi.fn(async () => "remote");
    const key = `mount-disabled-${Date.now()}`;

    const state = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        revalidateOnMount: false,
      }),
    );

    await settle();

    expect(fetcher).not.toHaveBeenCalled();
    expect(state.data.value).toBeUndefined();
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("still fetches when the key changes even if revalidateOnMount is false", async () => {
    const fetcher = vi.fn(async (...args: readonly unknown[]) => `value:${String(args[0])}`);
    const key = ref("first");

    const state = runComposable(() =>
      useSWRV<string>(() => key.value, fetcher, {
        revalidateOnMount: false,
      }),
    );

    await settle();
    expect(fetcher).not.toHaveBeenCalled();

    key.value = "second";
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenLastCalledWith("second");
    expect(state.data.value).toBe("value:second");
  });

  it("skips initial revalidation when isPaused returns true", async () => {
    const fetcher = vi.fn(async () => "remote");
    const key = `paused-mount-${Date.now()}`;

    const state = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        isPaused: () => true,
        revalidateOnMount: true,
      }),
    );

    await settle();

    expect(fetcher).not.toHaveBeenCalled();
    expect(state.data.value).toBeUndefined();
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("stops revalidation while paused and resumes when unpaused", async () => {
    let paused = false;
    let value = 0;
    const key = `paused-revalidate-${Date.now()}`;

    const state = runComposable(() =>
      useSWRV<number>(key, () => value++, {
        dedupingInterval: 0,
        isPaused: () => paused,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    paused = true;
    await state.mutate();
    await settle();

    expect(state.data.value).toBe(0);
    expect(value).toBe(1);

    paused = false;
    await state.mutate();
    await settle();

    expect(state.data.value).toBe(1);
    expect(value).toBe(2);
  });

  it("drops loading state and ignores errors that resolve while paused", async () => {
    vi.useFakeTimers();

    let paused = false;
    const key = `paused-error-${Date.now()}`;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((_resolve, reject) => {
          setTimeout(() => {
            reject(new Error("boom"));
          }, 20);
        }),
    );

    const state = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        revalidateOnMount: false,
        dedupingInterval: 0,
        errorRetryInterval: 10,
        isPaused: () => paused,
      }),
    );

    const revalidatePromise = state.mutate();
    await flush();
    expect(state.isValidating.value).toBe(true);

    paused = true;
    await vi.runAllTimersAsync();
    await revalidatePromise;
    await settle();

    expect(state.error.value).toBeUndefined();
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("keeps fallback data idle when revalidation is disabled", async () => {
    const fetcher = vi.fn(async () => "remote");
    const key = `fallback-idle-${Date.now()}`;

    const state = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        fallbackData: "fallback",
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }),
    );

    await settle();

    expect(fetcher).not.toHaveBeenCalled();
    expect(state.data.value).toBe("fallback");
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("revalidates on bound mutate without clearing the current data first", async () => {
    let value = 0;
    const key = `bound-mutate-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<string>(key, async () => `value:${value++}`, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toBe("value:0");

    const revalidatePromise = state.mutate();
    expect(state.data.value).toBe("value:0");

    await revalidatePromise;
    await settle();

    expect(state.data.value).toBe("value:1");
  });

  it("keeps config fallback data visible while the first request is validating", async () => {
    const key = `fallback-config-${Date.now()}`;
    let resolveValue!: (value: string) => void;

    const state = mountWithConfig(
      () =>
        useSWRV<string>(
          key,
          () =>
            new Promise<string>((resolve) => {
              resolveValue = resolve;
            }),
        ),
      {
        fallback: {
          [key]: "fallback",
        },
      },
    );

    await flush();

    expect(state().data.value).toBe("fallback");
    expect(state().isLoading.value).toBe(true);
    expect(state().isValidating.value).toBe(true);

    resolveValue("remote");
    await settle();

    expect(state().data.value).toBe("remote");
    expect(state().isLoading.value).toBe(false);
    expect(state().isValidating.value).toBe(false);
  });

  it("prefers cached data over config fallback", async () => {
    const key = `fallback-cache-${Date.now()}`;
    const client = createSWRVClient();
    const [serializedKey] = serialize(key);

    client.setState(
      serializedKey,
      {
        data: "cached",
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      0,
      key,
    );

    const state = mountWithConfig(() => useSWRV<string>(key), {
      client,
      fallback: {
        [key]: "fallback",
      },
    });

    await flush();

    expect(state().data.value).toBe("cached");
    expect(state().isLoading.value).toBe(false);
    expect(state().isValidating.value).toBe(false);
  });

  it("merges nested fallback maps across SWRVConfig boundaries", async () => {
    let config!: ReturnType<typeof useSWRVConfig>["config"];

    const Child = defineComponent({
      setup() {
        config = useSWRVConfig().config;
        return () => h("div");
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    containers.push(container);

    const app = createApp({
      render: () =>
        h(
          SWRVConfig,
          {
            value: {
              fallback: {
                a: 1,
                b: 1,
              },
            },
          },
          {
            default: () =>
              h(
                SWRVConfig,
                {
                  value: {
                    fallback: {
                      a: 2,
                      c: 2,
                    },
                  },
                },
                {
                  default: () => h(Child),
                },
              ),
          },
        ),
    });

    apps.push(app);
    app.mount(container);

    await flush();

    expect(config.fallback).toEqual({
      a: 2,
      b: 1,
      c: 2,
    });
  });

  it("supports functional SWRVConfig values without inheriting parent overrides", async () => {
    let config!: ReturnType<typeof useSWRVConfig>["config"];
    let parentDedupingInterval = 0;

    const Child = defineComponent({
      setup() {
        config = useSWRVConfig().config;
        return () => h("div");
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    containers.push(container);

    const app = createApp({
      render: () =>
        h(
          SWRVConfig,
          {
            value: {
              dedupingInterval: 1,
              refreshInterval: 1,
              fallback: {
                a: 1,
                b: 1,
              },
            },
          },
          {
            default: () =>
              h(
                SWRVConfig,
                {
                  value: (parentConfig: ReturnType<typeof useSWRVConfig>["config"]) => {
                    parentDedupingInterval = parentConfig.dedupingInterval;

                    return {
                      dedupingInterval: parentConfig.dedupingInterval + 2,
                      fallback: {
                        a: 2,
                        c: 2,
                      },
                    };
                  },
                },
                {
                  default: () => h(Child),
                },
              ),
          },
        ),
    });

    apps.push(app);
    app.mount(container);

    await flush();

    expect(parentDedupingInterval).toBe(1);
    expect(config.dedupingInterval).toBe(3);
    expect(config.refreshInterval).toBe(0);
    expect(config.fallback).toEqual({
      a: 2,
      c: 2,
    });
  });

  it("applies middleware in SWR order across config boundaries and per-hook config", async () => {
    const key: [string, number] = ["middleware", 1];
    const calls: Array<{ id: number; key: unknown }> = [];
    let state!: ReturnType<typeof useSWRV<string>>;

    const Child = defineComponent({
      setup() {
        state = useSWRV<string, unknown, [string, number]>(
          key,
          async (resource: string, id: number) => `${resource}:${id}`,
          {
            use: [createLoggerMiddleware(0, calls)],
          },
        );
        return () => h("div", state.data.value ?? "");
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    containers.push(container);

    const app = createApp({
      render: () =>
        h(
          SWRVConfig,
          { value: { use: [createLoggerMiddleware(2, calls)] } },
          {
            default: () =>
              h(
                SWRVConfig,
                { value: { use: [createLoggerMiddleware(1, calls)] } },
                {
                  default: () => h(Child),
                },
              ),
          },
        ),
    });

    apps.push(app);
    app.mount(container);

    await settle();

    expect(state.data.value).toBe("middleware:1");
    expect(calls.map((call) => call.id)).toEqual([2, 1, 0]);
    expect(calls[0].key).toEqual(key);
  });

  it("passes the original infinite key loader through middleware", async () => {
    const calls: Array<{ id: number; key: unknown }> = [];
    const resource = `page-${Date.now()}`;
    const getKey = (index: number) => (index === 0 ? ([resource, index] as const) : null);

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        getKey,
        async (...args: readonly unknown[]) => `${String(args[0])}:${String(args[1])}`,
        {
          use: [createLoggerMiddleware(0, calls)],
        },
      ),
    );

    await settle();

    expect(calls.map((call) => call.key)).toEqual([getKey]);
    expect(state.data.value).toEqual([`${resource}:0`]);
  });

  it("applies middleware to useSWRVMutation with the original key", async () => {
    const calls: Array<{ id: number; key: unknown }> = [];

    const mutation = mountWithConfig(
      () =>
        useSWRVMutation<string, Error, string, string>(
          "mutation-middleware",
          async (key: string, { arg }) => `${key}:${arg}`,
          { use: [createLoggerMiddleware(0, calls)] },
        ),
      { use: [createLoggerMiddleware(1, calls)] },
    );

    await flush();

    expect(calls.map((call) => call.id)).toEqual([1, 0]);
    expect(calls[0].key).toBe("mutation-middleware");
    await expect(mutation().trigger("value")).resolves.toBe("mutation-middleware:value");
  });

  it("passes the original subscription key through middleware", async () => {
    const calls: Array<{ id: number; key: unknown }> = [];
    const key = ["subscription", 1] as const;

    const state = runComposable(() =>
      useSWRVSubscription<string, Error, typeof key>(
        key,
        (_resolvedKey, { next }) => {
          next(undefined, "connected");
          return () => {};
        },
        { use: [createLoggerMiddleware(0, calls)] },
      ),
    );

    await settle();

    expect(calls.map((call) => call.key)).toEqual([key]);
    expect(state.data.value).toBe("connected");
  });

  it("revalidates on focus by default", async () => {
    let value = 0;
    const key = `focus-default-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
        focusThrottleInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("does not revalidate on focus when the option is disabled", async () => {
    let value = 0;
    const key = `focus-disabled-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
        revalidateOnFocus: false,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(0);
  });

  it("throttles focus revalidation immediately after mount", async () => {
    vi.useFakeTimers();

    let value = 0;
    const key = `focus-throttle-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
        focusThrottleInterval: 50,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    window.dispatchEvent(new Event("focus"));
    await settle();
    expect(state.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(60);
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("revalidates on reconnect by default", async () => {
    let value = 0;
    const key = `reconnect-default-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("does not revalidate on reconnect when the document is hidden", async () => {
    let value = 0;
    const restoreVisibility = mockVisibilityState("hidden");
    const key = `reconnect-hidden-${Date.now()}`;

    try {
      const state = runComposable(() =>
        useSWRV<number>(key, async () => value++, {
          dedupingInterval: 0,
        }),
      );

      await settle();
      expect(state.data.value).toBe(0);

      await waitForMacrotask();
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
      await settle();

      expect(state.data.value).toBe(0);
    } finally {
      restoreVisibility();
    }
  });

  it("respects config.isVisible when handling focus revalidation", async () => {
    let value = 0;
    let visible = true;
    const key = `focus-visible-${Date.now()}`;
    const client = createSWRVClient();
    const state = mountWithConfig(
      () =>
        useSWRV<number>(key, async () => value++, {
          dedupingInterval: 0,
          focusThrottleInterval: 0,
          isVisible: () => visible,
          revalidateOnMount: false,
        }),
      { client },
    );

    await state().mutate();
    await settle();
    await waitForMacrotask();
    expect(state().data.value).toBe(0);

    visible = false;
    await client.broadcastAll("focus");
    await settle();

    expect(state().data.value).toBe(0);

    visible = true;
    await client.broadcastAll("focus");
    await settle();

    expect(state().data.value).toBe(1);
  });

  it("respects config.isOnline when handling reconnect revalidation", async () => {
    let value = 0;
    let online = true;
    const key = `reconnect-online-${Date.now()}`;
    const client = createSWRVClient();
    const state = mountWithConfig(
      () =>
        useSWRV<number>(key, async () => value++, {
          dedupingInterval: 0,
          isOnline: () => online,
          revalidateOnMount: false,
        }),
      { client },
    );

    await state().mutate();
    await settle();
    await waitForMacrotask();
    expect(state().data.value).toBe(0);

    online = false;
    await client.broadcastAll("reconnect");
    await settle();

    expect(state().data.value).toBe(0);

    online = true;
    await client.broadcastAll("reconnect");
    await settle();

    expect(state().data.value).toBe(1);
  });

  it("calls onSuccess only for the original deduped request", async () => {
    const key = `success-callback-${Date.now()}`;
    const onSuccess = vi.fn();
    const fetcher = vi.fn(async () => "data");

    runComposable(() =>
      useSWRV<string>(key, fetcher, {
        onSuccess,
      }),
    );
    runComposable(() =>
      useSWRV<string>(key, fetcher, {
        onSuccess,
      }),
    );

    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith("data", key, expect.any(Object));
  });

  it("calls onError when the request fails", async () => {
    const key = `error-callback-${Date.now()}`;
    const onError = vi.fn();
    const error = new Error("boom");
    let rejectValue!: (error: Error) => void;

    const state = runComposable(() =>
      useSWRV<string>(
        key,
        () =>
          new Promise<string>((_resolve, reject) => {
            rejectValue = reject;
          }),
        {
          dedupingInterval: 0,
          onError,
          shouldRetryOnError: false,
        },
      ),
    );

    await flush();
    rejectValue(error);
    await settle();

    expect(state.error.value).toBe(error);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error, key, expect.any(Object));
  });

  it("uses the onErrorRetry callback to schedule retries", async () => {
    vi.useFakeTimers();

    const key = `error-retry-callback-${Date.now()}`;
    const onErrorRetry = vi.fn((_error, _retryKey, _config, revalidate, retryOptions) => {
      setTimeout(() => {
        void revalidate(retryOptions);
      }, 25);
    });
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");

    const state = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        dedupingInterval: 0,
        errorRetryInterval: 10,
        onErrorRetry,
      }),
    );

    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onErrorRetry).toHaveBeenCalledTimes(1);
    expect(state.error.value).toBeInstanceOf(Error);

    await vi.advanceTimersByTimeAsync(25);
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.data.value).toBe("recovered");
    expect(state.error.value).toBeUndefined();
  });

  it("calls onLoadingSlow for fresh requests that take too long", async () => {
    vi.useFakeTimers();

    const key = `loading-slow-${Date.now()}`;
    const onLoadingSlow = vi.fn();
    const onSuccess = vi.fn();
    let resolveValue!: (value: string) => void;

    const state = runComposable(() =>
      useSWRV<string>(
        key,
        () =>
          new Promise<string>((resolve) => {
            resolveValue = resolve;
          }),
        {
          loadingTimeout: 50,
          onLoadingSlow,
          onSuccess,
        },
      ),
    );

    await flush();
    expect(state.isLoading.value).toBe(true);
    expect(onLoadingSlow).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60);
    await flush();

    expect(onLoadingSlow).toHaveBeenCalledTimes(1);
    expect(onLoadingSlow).toHaveBeenCalledWith(key, expect.any(Object));
    expect(onSuccess).not.toHaveBeenCalled();

    resolveValue("data");
    await settle();

    expect(state.data.value).toBe("data");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith("data", key, expect.any(Object));
  });

  it("calls onDiscarded and skips onSuccess when a revalidation result is superseded", async () => {
    vi.useFakeTimers();

    const key = `discarded-${Date.now()}`;
    const onDiscarded = vi.fn();
    const onSuccess = vi.fn();

    const state = runComposable(() =>
      useSWRV<string>(
        key,
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => {
              resolve("remote");
            }, 50);
          }),
        {
          dedupingInterval: 0,
          onDiscarded,
          onSuccess,
        },
      ),
    );

    await flush();
    await state.mutate("local", { revalidate: false });
    await flush();

    expect(state.data.value).toBe("local");

    await vi.advanceTimersByTimeAsync(60);
    await settle();

    expect(state.data.value).toBe("local");
    expect(onDiscarded).toHaveBeenCalledTimes(1);
    expect(onDiscarded).toHaveBeenCalledWith(key);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("retries failed requests after errorRetryInterval", async () => {
    vi.useFakeTimers();
    const key = `retry-${Date.now()}`;

    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");

    const state = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        dedupingInterval: 0,
        errorRetryCount: 1,
        errorRetryInterval: 50,
      }),
    );

    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.error.value).toBeInstanceOf(Error);

    await vi.advanceTimersByTimeAsync(50);
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.data.value).toBe("recovered");
    expect(state.error.value).toBeUndefined();
  });

  it("disables polling in the immutable entry point", async () => {
    vi.useFakeTimers();

    let value = 0;
    const state = runComposable(() =>
      useSWRVImmutable<number>("immutable-refresh", async () => value++, {
        dedupingInterval: 0,
        refreshInterval: 10,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(50);
    await settle();

    expect(state.data.value).toBe(0);
    expect(value).toBe(1);
  });
});
