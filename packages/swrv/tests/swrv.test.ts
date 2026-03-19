import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createSWRVClient,
  mutate,
  preload,
  useSWRV,
  useSWRVConfig,
  useSWRVInfinite,
  useSWRVMutation,
  useSWRVSubscription,
} from "../src";
import { unstable_serialize as unstableSerializeInfinite } from "../src/infinite";
import { serialize } from "../src/_internal";
import type { SWRVMutationConfiguration } from "../src";
import {
  flush,
  mountWithClient,
  mountWithConfig,
  runComposable,
  settle,
  waitForMacrotask,
} from "./test-utils";

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

  it("does not revalidate when a reactive key source invalidates but the serialized key stays the same", async () => {
    const trigger = ref(0);
    const fetcher = vi.fn(async (...args: readonly unknown[]) => args.map(String).join(":"));

    const state = runComposable(() =>
      useSWRV<string>(
        computed(() => {
          void trigger.value;
          return ["stable-key", 1] as const;
        }),
        fetcher,
        { dedupingInterval: 0 },
      ),
    );

    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.data.value).toBe("stable-key:1");

    trigger.value += 1;
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.data.value).toBe("stable-key:1");
  });

  it("uses cache listener payloads without rereading the cache for the active hook", async () => {
    const key = `listener-payload-${Date.now()}`;
    const client = createSWRVClient();
    const state = mountWithClient(client, key);
    const [serializedKey] = serialize(key);

    await flush();

    const getStateSpy = vi.spyOn(client, "getState");
    getStateSpy.mockClear();

    client.setState(
      serializedKey,
      {
        data: "payload",
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      0,
      key,
    );

    await flush();

    expect(state().data.value).toBe("payload");
    expect(getStateSpy).not.toHaveBeenCalled();
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

  it("supports optimisticData in infinite bound mutate", async () => {
    let value = 0;
    const key = `infinite-optimistic-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    let resolveMutation!: (value: string[]) => void;
    const mutationPromise = state.mutate(
      new Promise<string[]>((resolve) => {
        resolveMutation = resolve;
      }),
      {
        optimisticData: ["optimistic"],
      },
    );

    await flush();
    expect(state.data.value).toEqual(["optimistic"]);

    resolveMutation(["updated"]);
    await expect(mutationPromise).resolves.toEqual(["updated"]);
    await settle();

    expect(state.data.value).toEqual(["foo-1"]);
  });

  it("supports functional optimisticData in infinite bound mutate", async () => {
    let value = 0;
    const key = `infinite-functional-optimistic-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    let resolveMutation!: (value: string[]) => void;
    const mutationPromise = state.mutate(
      new Promise<string[]>((resolve) => {
        resolveMutation = resolve;
      }),
      {
        optimisticData: (current) => [...(current ?? []), "optimistic"],
      },
    );

    await flush();
    expect(state.data.value).toEqual(["foo-0", "optimistic"]);

    resolveMutation(["updated"]);
    await expect(mutationPromise).resolves.toEqual(["updated"]);
    await settle();

    expect(state.data.value).toEqual(["foo-1"]);
  });

  it("supports functional populateCache in infinite bound mutate", async () => {
    let value = 0;
    const key = `infinite-populate-transform-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    await expect(
      state.mutate(Promise.resolve(["updated"]), {
        populateCache: (result, currentData) => [...(currentData ?? []), ...result],
        revalidate: false,
      }),
    ).resolves.toEqual(["updated"]);
    await settle();

    expect(state.data.value).toEqual(["foo-0", "updated"]);
  });

  it("supports disabling populateCache in infinite bound mutate", async () => {
    let value = 0;
    const key = `infinite-populate-disabled-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    await expect(
      state.mutate(Promise.resolve(["updated"]), {
        populateCache: false,
        revalidate: false,
      }),
    ).resolves.toEqual(["updated"]);
    await settle();

    expect(state.data.value).toEqual(["foo-0"]);
  });

  it("supports optimistic multi-page transforms in infinite bound mutate", async () => {
    const key = `infinite-multi-page-mutate-${Date.now()}`;
    const apiData: Record<number, string[]> = {
      0: ["A1", "A2", "A3"],
      1: ["B1", "B2", "B3"],
    };

    const state = runComposable(() =>
      useSWRVInfinite<string[]>(
        (index) => [key, index] as const,
        async (...args: readonly unknown[]) => [...apiData[Number(args[1])]],
        {
          dedupingInterval: 0,
          initialSize: 2,
        },
      ),
    );

    await settle(6);
    expect(state.data.value).toEqual([
      ["A1", "A2", "A3"],
      ["B1", "B2", "B3"],
    ]);

    let resolveMutation!: (value: string[]) => void;
    const mutationPromise = state.mutate(
      new Promise<string[]>((resolve) => {
        resolveMutation = resolve;
      }),
      {
        optimisticData: (current) => [current?.[0] ?? [], [...(current?.[1] ?? []), "B4"]],
        populateCache: (result, currentData) => [
          currentData?.[0] ?? [],
          [...(currentData?.[1] ?? []), ...result],
        ],
        revalidate: false,
      },
    );

    await flush();
    expect(state.data.value).toEqual([
      ["A1", "A2", "A3"],
      ["B1", "B2", "B3", "B4"],
    ]);

    resolveMutation(["updated"]);
    await expect(mutationPromise).resolves.toEqual(["updated"]);
    await settle();

    expect(state.data.value).toEqual([
      ["A1", "A2", "A3"],
      ["B1", "B2", "B3", "updated"],
    ]);
  });

  it("rolls back optimistic infinite mutations when rollbackOnError is enabled", async () => {
    let value = 0;
    const key = `infinite-rollback-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    let rejectMutation!: (reason?: unknown) => void;
    const mutationPromise = state.mutate(
      new Promise<string[]>((_resolve, reject) => {
        rejectMutation = reject;
      }),
      {
        optimisticData: ["optimistic"],
        rollbackOnError: true,
        revalidate: false,
      },
    );

    await flush();
    expect(state.data.value).toEqual(["optimistic"]);

    rejectMutation(new Error("boom"));
    await expect(mutationPromise).rejects.toThrow("boom");
    await settle();

    expect(state.data.value).toEqual(["foo-0"]);
  });

  it("keeps optimistic infinite mutations when rollbackOnError is false", async () => {
    let value = 0;
    const key = `infinite-no-rollback-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["foo-0"]);

    let rejectMutation!: (reason?: unknown) => void;
    const mutationPromise = state.mutate(
      new Promise<string[]>((_resolve, reject) => {
        rejectMutation = reject;
      }),
      {
        optimisticData: ["optimistic"],
        rollbackOnError: false,
        revalidate: false,
      },
    );

    await flush();
    expect(state.data.value).toEqual(["optimistic"]);

    rejectMutation(new Error("boom"));
    await expect(mutationPromise).rejects.toThrow("boom");
    await settle();

    expect(state.data.value).toEqual(["optimistic"]);
  });

  it("throws infinite mutation errors when throwOnError is enabled", async () => {
    let value = 0;
    const key = `infinite-throw-on-error-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();

    await expect(
      state.mutate(Promise.reject(new Error("mutation error")), {
        throwOnError: true,
        revalidate: false,
      }),
    ).rejects.toThrow("mutation error");
  });

  it("does not throw infinite mutation errors when throwOnError is false", async () => {
    let value = 0;
    const key = `infinite-no-throw-on-error-${Date.now()}`;
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => (index === 0 ? key : null),
        async () => `foo-${value++}`,
        {
          dedupingInterval: 0,
        },
      ),
    );

    await settle();

    await expect(
      state.mutate(Promise.reject(new Error("mutation error")), {
        throwOnError: false,
        revalidate: false,
      }),
    ).resolves.toBeUndefined();
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

  it("mutates infinite caches through unstable_serialize", async () => {
    let count = 0;
    const key = `infinite-serialize-${Date.now()}`;
    const getKey = (index: number) => `page-test-${key}-${index}`;

    const state = runComposable(() =>
      useSWRVInfinite<any>(
        (index) => getKey(index),
        async (...args: readonly unknown[]) => `${String(args[0])}:${++count}`,
        { dedupingInterval: 0 },
      ),
    );

    await settle();
    expect(state.data.value).toEqual([`${getKey(0)}:1`]);

    await mutate(unstableSerializeInfinite((index) => getKey(index)));
    await settle();
    expect(state.data.value).toEqual([`${getKey(0)}:2`]);

    await mutate(
      unstableSerializeInfinite((index) => getKey(index)),
      "local-mutation",
      false,
    );
    await settle();
    expect(state.data.value).toBe("local-mutation");
  });

  it("mutates infinite caches through unstable_serialize based on current data", async () => {
    const key = `infinite-serialize-current-${Date.now()}`;
    const getKey = (index: number) => [key, index] as const;

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        getKey,
        async (...args: readonly unknown[]) => `page ${String(args[1])}, `,
      ),
    );

    await settle();
    await state.setSize(2);
    await settle();
    expect(state.data.value).toEqual(["page 0, ", "page 1, "]);

    await mutate<string[]>(
      unstableSerializeInfinite(getKey),
      (current) => (current ?? []).map((value) => `(edited)${value}`),
      false,
    );
    await settle();

    expect(state.data.value).toEqual(["(edited)page 0, ", "(edited)page 1, "]);
  });

  it("keeps mutated aggregate infinite data when size grows later", async () => {
    const key = `infinite-grow-after-mutate-${Date.now()}`;
    const fetchCounts = [0, 0, 0];
    const fetcher = vi.fn(async (...args: readonly unknown[]) => {
      const index = Number(args[1]);
      const version = fetchCounts[index] ?? 0;
      fetchCounts[index] = version + 1;
      return `page ${index}:${version}`;
    });

    const state = runComposable(() =>
      useSWRVInfinite<string>((index) => [key, index] as const, fetcher, {
        dedupingInterval: 0,
        initialSize: 2,
      }),
    );

    await settle();
    expect(state.data.value).toEqual(["page 0:0", "page 1:0"]);

    await state.mutate(["(edited)page 0", "(edited)page 1"], false);
    await settle();
    expect(state.data.value).toEqual(["(edited)page 0", "(edited)page 1"]);

    await state.setSize(3);
    await settle();

    expect(state.data.value).toEqual(["page 0:1", "page 1:1", "page 2:0"]);
  });

  it("uses seeded first-page cache data with unstable_serialize revalidation", async () => {
    const key = `infinite-seeded-${Date.now()}`;
    const client = createSWRVClient();
    client.setState<string, Error>(
      key,
      {
        data: "initial-cache",
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      0,
      key,
    );

    const state = mountWithConfig(
      () => {
        const { mutate: scopedMutate } = useSWRVConfig();
        const swrv = useSWRVInfinite<any>(
          () => key,
          async () => "response data",
          {
            dedupingInterval: 0,
          },
        );

        return { scopedMutate, swrv };
      },
      { client },
    );

    await settle();
    expect(state().swrv.data.value).toEqual(["initial-cache"]);

    await state().scopedMutate(unstableSerializeInfinite(() => key));
    await settle();
    expect(state().swrv.data.value).toEqual(["response data"]);

    await state().scopedMutate(
      unstableSerializeInfinite(() => key),
      "local-mutation",
      false,
    );
    await settle();
    expect(state().swrv.data.value).toBe("local-mutation");
  });

  it("keeps the initial size when the infinite key is null", async () => {
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        () => null,
        async (...args: readonly unknown[]) => `page:${String(args[0])}`,
      ),
    );

    expect(state.size.value).toBe(1);
    await expect(state.setSize(2)).resolves.toBeUndefined();
    expect(state.size.value).toBe(1);
  });

  it("keeps fallbackData visible while growing infinite size with an empty cache", async () => {
    const key = `infinite-fallback-${Date.now()}`;
    const pending: Array<(value: string) => void> = [];
    const resolvePending = async () => {
      while (pending.length > 0) {
        pending.splice(0).forEach((resolve) => {
          resolve("response value");
        });
        await settle();
      }
    };
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => `${key}-${index}`,
        async () =>
          await new Promise<string>((resolve) => {
            pending.push(resolve);
          }),
        { fallbackData: ["fallback-1", "fallback-2"] },
      ),
    );

    expect(state.data.value).toEqual(["fallback-1", "fallback-2"]);

    const setSizePromise = state.setSize(2);
    await flush();
    expect(state.data.value).toEqual(["fallback-1", "fallback-2"]);

    await resolvePending();
    await setSizePromise;
    await settle();
  });

  it("shares loaded page data with plain useSWRV consumers", async () => {
    const key = `infinite-share-${Date.now()}`;
    const infinite = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => `${key}-${index + 1}`,
        async (...args: readonly unknown[]) => `${String(args[0])},`,
        {
          dedupingInterval: 0,
        },
      ),
    );
    const page = runComposable(() => useSWRV<string>(`${key}-2`));

    await settle();

    expect(infinite.data.value).toEqual([`${key}-1,`]);
    expect(page.data.value).toBeUndefined();

    await infinite.setSize((size) => size + 1);
    await settle();

    expect(infinite.data.value).toEqual([`${key}-1,`, `${key}-2,`]);
    expect(page.data.value).toBe(`${key}-2,`);
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

  it("passes the original key and trigger arg through mutation fetchers", async () => {
    const key = [`mutation-args-${Date.now()}`, "arg0"] as const;
    const fetcher = vi.fn(
      async (resolvedKey: typeof key, { arg }: { arg: string }) =>
        `${resolvedKey[0]}:${resolvedKey[1]}:${arg}`,
    );
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string, typeof key>(key, fetcher),
    );

    await expect(mutation.trigger("arg1")).resolves.toBe(`${key[0]}:${key[1]}:arg1`);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(key, { arg: "arg1" });
  });

  it("calls mutation onSuccess from hook config", async () => {
    const key = `mutation-success-${Date.now()}`;
    const onSuccess = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => "data", {
        onSuccess,
      }),
    );

    await expect(mutation.trigger(undefined)).resolves.toBe("data");
    await settle();

    expect(mutation.data.value).toBe("data");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0]?.[0]).toBe("data");
    expect(onSuccess.mock.calls[0]?.[1]).toBe(key);
  });

  it("supports configuring mutation onSuccess per trigger", async () => {
    const key = `mutation-success-trigger-${Date.now()}`;
    const onSuccess = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => "data"),
    );

    await expect(mutation.trigger(undefined, { onSuccess })).resolves.toBe("data");
    await settle();

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0]?.[0]).toBe("data");
    expect(onSuccess.mock.calls[0]?.[1]).toBe(key);
  });

  it("calls mutation onError and throws by default", async () => {
    const key = `mutation-throw-${Date.now()}`;
    const onError = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        key,
        async () => {
          throw new Error("boom");
        },
        {
          onError,
        },
      ),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("boom");
    await settle();

    expect(mutation.error.value?.message).toBe("boom");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[1]).toBe(key);
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

  it("tracks isMutating while a mutation request is in flight", async () => {
    const key = `mutation-pending-${Date.now()}`;
    let resolveMutation!: (value: string) => void;
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        key,
        async () =>
          await new Promise<string>((resolve) => {
            resolveMutation = resolve;
          }),
      ),
    );

    const mutationPromise = mutation.trigger(undefined);
    await flush();
    expect(mutation.isMutating.value).toBe(true);

    resolveMutation("data");
    await expect(mutationPromise).resolves.toBe("data");
    await settle();

    expect(mutation.data.value).toBe("data");
    expect(mutation.isMutating.value).toBe(false);
  });

  it("does not read shared useSWRV cache into mutation-local state", async () => {
    const key = `mutation-cache-isolation-${Date.now()}`;
    const swrv = runComposable(() => useSWRV<string>(key, async () => "data"));
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => "wrong"),
    );

    await settle();

    expect(swrv.data.value).toBe("data");
    expect(mutation.data.value).toBeUndefined();
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

    const options: SWRVMutationConfiguration<number, Error, void, string, number> = {
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

  it("supports optimistic shared-cache updates through mutation hooks", async () => {
    const key = `mutation-optimistic-${Date.now()}`;
    const swrv = runComposable(() =>
      useSWRV<string[]>(key, async () => ["foo"], {
        dedupingInterval: 0,
      }),
    );
    let resolveMutation!: (value: string) => void;
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string, string, string[]>(
        key,
        async (_key, { arg }) =>
          await new Promise<string>((resolve) => {
            resolveMutation = () => resolve(arg.toUpperCase());
          }),
      ),
    );

    await settle();
    expect(swrv.data.value).toEqual(["foo"]);

    const mutationPromise = mutation.trigger<string[]>("bar", {
      optimisticData: (current) => [...(current ?? []), "bar"],
      populateCache: (result, current) => [...(current ?? []), result],
      revalidate: false,
    });

    await flush();
    expect(swrv.data.value).toEqual(["foo", "bar"]);

    resolveMutation("BAR");
    await expect(mutationPromise).resolves.toBe("BAR");
    await settle();

    expect(swrv.data.value).toEqual(["foo", "BAR"]);
  });

  it("does not dedupe repeated mutation triggers", async () => {
    const key = `mutation-no-dedupe-${Date.now()}`;
    const calls = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => {
        calls();
        await waitForMacrotask();
        return "data";
      }),
    );

    const first = mutation.trigger(undefined);
    const second = mutation.trigger(undefined);
    const third = mutation.trigger(undefined);
    await flush();

    expect(calls).toHaveBeenCalledTimes(3);

    await expect(first).resolves.toBe("data");
    await expect(second).resolves.toBe("data");
    await expect(third).resolves.toBe("data");
  });

  it("always uses the latest mutation fetcher closure state", async () => {
    const key = `mutation-latest-fetcher-${Date.now()}`;
    const count = ref(0);
    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, void>(key, async () => count.value),
    );

    await expect(mutation.trigger(undefined)).resolves.toBe(0);
    await settle();
    expect(mutation.data.value).toBe(0);

    count.value = 1;
    await expect(mutation.trigger(undefined)).resolves.toBe(1);
    await settle();
    expect(mutation.data.value).toBe(1);
  });

  it("always uses the latest mutation config closure state", async () => {
    const key = `mutation-latest-config-${Date.now()}`;
    const count = ref(0);
    const logs: number[] = [];
    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, void>(key, async () => count.value, {
        onSuccess() {
          logs.push(count.value);
        },
      }),
    );

    await expect(mutation.trigger(undefined)).resolves.toBe(0);
    await settle();
    expect(logs).toEqual([0]);

    count.value = 1;
    await expect(mutation.trigger(undefined)).resolves.toBe(1);
    await settle();
    expect(logs).toEqual([0, 1]);
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

  it("clears mutation error state after a later successful trigger", async () => {
    const key = `mutation-error-clear-${Date.now()}`;
    let shouldSucceed = false;
    const mutation = runComposable(() =>
      useSWRVMutation<string[], Error, void>(key, async () => {
        if (shouldSucceed) {
          return ["foo"];
        }

        throw new Error("error");
      }),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("error");
    await settle();
    expect(mutation.error.value?.message).toBe("error");

    shouldSucceed = true;
    await expect(mutation.trigger(undefined)).resolves.toEqual(["foo"]);
    await settle();

    expect(mutation.error.value).toBeUndefined();
  });

  it("throws when triggering a mutation without a fetcher", async () => {
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>("missing-fetcher", null),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("missing fetcher");
  });

  it("throws when triggering a mutation without a key", async () => {
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(null, async () => "data"),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("missing key");
  });

  it("calls mutation onError and the returned rejection handler for falsey errors", async () => {
    const key = `mutation-falsey-error-${Date.now()}`;
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onRejected = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<never, string, void>(
        key,
        async () =>
          await new Promise<never>((_resolve, reject) => {
            reject("");
          }),
        {
          onError,
          onSuccess,
        },
      ),
    );

    await expect(mutation.trigger(undefined)).rejects.toBe("");
    await mutation.trigger(undefined).catch(onRejected);
    await settle();

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalled();
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
});
