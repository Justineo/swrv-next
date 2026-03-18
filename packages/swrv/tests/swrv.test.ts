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
  useSWRV,
  useSWRVConfig,
  useSWRVImmutable,
  useSWRVInfinite,
  useSWRVMutation,
  useSWRVSubscription,
} from "../src";
import { serialize } from "../src/_internal";

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
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
        focusThrottleInterval: 0,
        isVisible: () => visible,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    visible = false;
    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(0);

    visible = true;
    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("respects config.isOnline when handling reconnect revalidation", async () => {
    let value = 0;
    let online = true;
    const key = `reconnect-online-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
        isOnline: () => online,
        revalidateOnMount: false,
      }),
    );

    await state.mutate();
    await settle();
    expect(state.data.value).toBe(0);

    online = false;
    await waitForMacrotask();
    window.dispatchEvent(new Event("online"));
    await settle();

    expect(state.data.value).toBe(0);

    online = true;
    await waitForMacrotask();
    window.dispatchEvent(new Event("online"));
    await settle();

    expect(state.data.value).toBe(1);
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
