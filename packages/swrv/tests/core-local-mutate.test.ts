import { describe, expect, it, vi } from "vite-plus/test";

import { mutate, useSWRV, useSWRVConfig, useSWRVInfinite, useSWRVSubscription } from "../src";
import { flush, mountWithConfig, runComposable, settle } from "./test-utils";

describe("swrv core local mutate behavior", () => {
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

  it("passes the current cached value to scoped mutate callbacks", async () => {
    const key = `mutate-callback-${Date.now()}`;
    const state = mountWithConfig(() => useSWRVConfig(), {
      provider: () =>
        new Map([
          [
            key,
            {
              data: "cached data",
              error: undefined,
              expiresAt: Number.POSITIVE_INFINITY,
              isLoading: false,
              isValidating: false,
              updatedAt: Date.now(),
            },
          ],
        ]),
    });

    const callback = vi.fn((current: string | undefined) => current);
    await state().mutate(key, callback, false);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("cached data");
  });

  it("passes undefined to scoped mutate callbacks when the key is not cached", async () => {
    const state = mountWithConfig(() => useSWRVConfig());
    const key = `mutate-uncached-${Date.now()}`;
    const increment = vi.fn((current: number | undefined) =>
      current == null ? undefined : current + 1,
    );

    await state().mutate(key, increment, false);

    expect(increment).toHaveBeenCalledTimes(1);
    expect(increment).toHaveBeenCalledWith(undefined);
    expect(increment).toHaveReturnedWith(undefined);

    state().cache.set(key, {
      data: 42,
      error: undefined,
      expiresAt: Number.POSITIVE_INFINITY,
      isLoading: false,
      isValidating: false,
      updatedAt: Date.now(),
    });

    await state().mutate(key, increment, false);

    expect(increment).toHaveBeenCalledTimes(2);
    expect(increment).toHaveBeenLastCalledWith(42);
    expect(increment).toHaveLastReturnedWith(43);
  });

  it("returns the result of resolved and rejected global mutations", async () => {
    const key = `global-mutate-result-${Date.now()}`;

    await expect(mutate(key, Promise.resolve("data"), false)).resolves.toBe("data");
    await expect(mutate(key, Promise.reject(new Error("error")), false)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("returns undefined when global mutate receives an empty serialized key", async () => {
    await expect(mutate(null, Promise.resolve("data"), false)).resolves.toBeUndefined();
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

    await expect(revalidatePromise).resolves.toBe("value:1");
    await settle();

    expect(state.data.value).toBe("value:1");
  });
});
