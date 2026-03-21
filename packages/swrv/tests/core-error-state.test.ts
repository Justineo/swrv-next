import { ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { useSWRV } from "../src";
import { flush, runComposable, settle } from "./test-utils";

describe("swrv core error behavior", () => {
  it("resets validating state after a synchronous fetcher error", async () => {
    const state = runComposable(() =>
      useSWRV<string, Error>(`error-sync-${Date.now()}`, () => {
        throw new Error("boom");
      }),
    );

    await settle();

    expect(state.error.value?.message).toBe("boom");
    expect(state.isValidating.value).toBe(false);
    expect(state.isLoading.value).toBe(false);
  });

  it("resets validating state after an asynchronous fetcher error", async () => {
    const state = runComposable(() =>
      useSWRV<string, Error>(
        `error-async-${Date.now()}`,
        async () => {
          throw new Error("boom");
        },
        {
          shouldRetryOnError: false,
        },
      ),
    );

    await settle();

    expect(state.error.value?.message).toBe("boom");
    expect(state.isValidating.value).toBe(false);
    expect(state.isLoading.value).toBe(false);
  });

  it("dedupes onError callbacks across hooks sharing a key", async () => {
    const key = `error-dedupe-${Date.now()}`;
    const onError = vi.fn();
    const fetcher = vi.fn(async () => {
      throw new Error("boom");
    });

    runComposable(() =>
      useSWRV<string, Error>(key, fetcher, {
        onError,
        shouldRetryOnError: false,
      }),
    );
    runComposable(() =>
      useSWRV<string, Error>(key, fetcher, {
        onError,
        shouldRetryOnError: false,
      }),
    );

    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[1]).toBe(key);
  });

  it("keeps the last error visible while a manual revalidation is in flight", async () => {
    let resolveSuccess!: (value: string) => void;
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSuccess = resolve;
          }),
      );

    const state = runComposable(() =>
      useSWRV<string, Error>(`error-manual-revalidate-${Date.now()}`, fetcher, {
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }),
    );

    await settle();
    expect(state.error.value?.message).toBe("boom");

    const mutation = state.mutate();
    await flush();

    expect(state.error.value?.message).toBe("boom");
    expect(state.isValidating.value).toBe(true);

    resolveSuccess("ok");
    await mutation;
    await settle();

    expect(state.data.value).toBe("ok");
    expect(state.error.value).toBeUndefined();
    expect(state.isValidating.value).toBe(false);
  });

  it("respects shouldRetryOnError: false", async () => {
    vi.useFakeTimers();

    const fetcher = vi.fn(async () => {
      throw new Error("boom");
    });

    runComposable(() =>
      useSWRV<string, Error>(`error-no-retry-${Date.now()}`, fetcher, {
        dedupingInterval: 0,
        errorRetryInterval: 50,
        shouldRetryOnError: false,
      }),
    );

    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("respects shouldRetryOnError returning true", async () => {
    vi.useFakeTimers();
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");

    const state = runComposable(() =>
      useSWRV<string, Error>(`error-yes-retry-${Date.now()}`, fetcher, {
        dedupingInterval: 0,
        errorRetryInterval: 50,
        shouldRetryOnError: () => true,
      }),
    );

    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.data.value).toBe("recovered");
    expect(state.error.value).toBeUndefined();
    random.mockRestore();
  });

  it("does not fire onError or onErrorRetry for a stale key after switching keys", async () => {
    vi.useFakeTimers();

    const baseKey = `error-stale-key-${Date.now()}`;
    const current = ref("slow");
    const onError = vi.fn();
    const onErrorRetry = vi.fn();
    const fetcher = vi.fn(async (resolvedKey: string) => {
      await new Promise((resolve) => {
        setTimeout(resolve, resolvedKey.endsWith("slow") ? 200 : 100);
      });

      if (resolvedKey.endsWith("slow")) {
        throw new Error(`boom:${resolvedKey}`);
      }

      return resolvedKey;
    });

    const state = runComposable(() =>
      useSWRV<string, Error, string>(() => `${baseKey}-${current.value}`, fetcher, {
        dedupingInterval: 0,
        onError,
        onErrorRetry,
      }),
    );

    current.value = "fast";
    await flush();

    await vi.advanceTimersByTimeAsync(100);
    await settle();

    expect(state.data.value).toBe(`${baseKey}-fast`);
    expect(onError).not.toHaveBeenCalled();
    expect(onErrorRetry).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    await settle();

    expect(state.data.value).toBe(`${baseKey}-fast`);
    expect(state.error.value).toBeUndefined();
    expect(onError).not.toHaveBeenCalled();
    expect(onErrorRetry).not.toHaveBeenCalled();
  });

  it("does not revalidate on mount when another mounted consumer already holds a cached error", async () => {
    const key = `error-second-consumer-${Date.now()}`;
    const fetcher = vi.fn(async () => {
      throw new Error("boom");
    });

    runComposable(() =>
      useSWRV<string, Error>(key, fetcher, {
        shouldRetryOnError: false,
      }),
    );

    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);

    const second = runComposable(() =>
      useSWRV<string, Error>(key, fetcher, {
        shouldRetryOnError: false,
      }),
    );

    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.error.value?.message).toBe("boom");
  });
});
