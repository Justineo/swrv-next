import { describe, expect, it, vi } from "vite-plus/test";

import { useSWRV } from "../src";
import { flush, runComposable, settle } from "./test-utils";

describe("swrv core broadcast behavior", () => {
  it("broadcasts refreshed data across hooks sharing the same key", async () => {
    vi.useFakeTimers();

    let count = 0;
    const key = `broadcast-data-${Date.now()}`;

    const state = runComposable(() => ({
      first: useSWRV<number>(key, async () => count++, {
        refreshInterval: 100,
        dedupingInterval: 10,
      }),
      second: useSWRV<number>(key, async () => count++, {
        refreshInterval: 100,
        dedupingInterval: 10,
      }),
      third: useSWRV<number>(key, async () => count++, {
        refreshInterval: 100,
        dedupingInterval: 10,
      }),
    }));

    await settle();
    expect(state.first.data.value).toBe(0);
    expect(state.second.data.value).toBe(0);
    expect(state.third.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(state.first.data.value).toBe(1);
    expect(state.second.data.value).toBe(1);
    expect(state.third.data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(state.first.data.value).toBe(2);
    expect(state.second.data.value).toBe(2);
    expect(state.third.data.value).toBe(2);
  });

  it("broadcasts shared errors across hooks", async () => {
    vi.useFakeTimers();

    let count = 0;
    const key = `broadcast-error-${Date.now()}`;
    const fetcher = vi.fn(async () => {
      if (count === 2) {
        count += 1;
        throw new Error("err");
      }

      return count++;
    });

    const state = runComposable(() => ({
      first: useSWRV<number, Error>(key, fetcher, {
        refreshInterval: 100,
        dedupingInterval: 10,
        shouldRetryOnError: false,
      }),
      second: useSWRV<number, Error>(key, fetcher, {
        refreshInterval: 100,
        dedupingInterval: 10,
        shouldRetryOnError: false,
      }),
      third: useSWRV<number, Error>(key, fetcher, {
        refreshInterval: 100,
        dedupingInterval: 10,
        shouldRetryOnError: false,
      }),
    }));

    await settle();
    expect(state.first.data.value).toBe(0);
    expect(state.second.data.value).toBe(0);
    expect(state.third.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(state.first.data.value).toBe(1);
    expect(state.second.data.value).toBe(1);
    expect(state.third.data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(100);
    await settle();

    expect(state.first.error.value?.message).toBe("err");
    expect(state.second.error.value?.message).toBe("err");
    expect(state.third.error.value?.message).toBe("err");
  });

  it("broadcasts validating state during manual revalidation", async () => {
    const key = `broadcast-validating-${Date.now()}`;
    let sequence = 0;
    const resolvers: Array<(value: string) => void> = [];
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const state = runComposable(() => ({
      first: useSWRV<string>(key, fetcher, {
        dedupingInterval: 10,
      }),
      second: useSWRV<string>(key, fetcher, {
        dedupingInterval: 10,
      }),
      third: useSWRV<string>(key, fetcher, {
        dedupingInterval: 10,
      }),
    }));

    await flush();
    expect(state.first.isValidating.value).toBe(true);
    expect(state.second.isValidating.value).toBe(true);
    expect(state.third.isValidating.value).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolvers.shift()?.(`data-${sequence++}`);
    await settle();

    expect(state.first.isValidating.value).toBe(false);
    expect(state.second.isValidating.value).toBe(false);
    expect(state.third.isValidating.value).toBe(false);

    const revalidatePromise = state.first.mutate();
    await flush();

    expect(state.first.isLoading.value).toBe(false);
    expect(state.first.isValidating.value).toBe(true);
    expect(state.second.isValidating.value).toBe(true);
    expect(state.third.isValidating.value).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);

    resolvers.shift()?.(`data-${sequence++}`);
    await revalidatePromise;
    await settle();

    expect(state.first.isValidating.value).toBe(false);
    expect(state.second.isValidating.value).toBe(false);
    expect(state.third.isValidating.value).toBe(false);
    expect(state.first.data.value).toBe("data-1");
    expect(state.second.data.value).toBe("data-1");
    expect(state.third.data.value).toBe("data-1");
  });
});
