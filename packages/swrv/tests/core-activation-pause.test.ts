import { ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { useSWRV } from "../src";
import { flush, runComposable, settle } from "./test-utils";

describe("swrv core activation and pause behavior", () => {
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

  it("revalidates on mount even when fallbackData is provided", async () => {
    const key = `fallback-revalidate-on-mount-${Date.now()}`;
    let resolveValue!: (value: string) => void;
    const fetcher = vi.fn(
      async () =>
        await new Promise<string>((resolve) => {
          resolveValue = resolve;
        }),
    );

    const state = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        revalidateOnMount: true,
        fallbackData: "fallback",
      }),
    );

    await flush();

    expect(state.data.value).toBe("fallback");
    expect(state.isValidating.value).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveValue("remote");
    await settle();

    expect(state.data.value).toBe("remote");
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
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
});
