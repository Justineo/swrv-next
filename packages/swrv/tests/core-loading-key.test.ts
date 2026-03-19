import { ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { useSWRV } from "../src";
import { flush, runComposable, settle } from "./test-utils";

describe("swrv core loading and key behavior", () => {
  it("returns loading and validating states while an initial request is pending", async () => {
    const key = `loading-${Date.now()}`;
    let resolveValue!: (value: string) => void;

    const state = runComposable(() =>
      useSWRV<string>(
        key,
        () =>
          new Promise<string>((resolve) => {
            resolveValue = resolve;
          }),
        {
          dedupingInterval: 0,
        },
      ),
    );

    await flush();

    expect(state.data.value).toBeUndefined();
    expect(state.isLoading.value).toBe(true);
    expect(state.isValidating.value).toBe(true);

    resolveValue("data");
    await settle();

    expect(state.data.value).toBe("data");
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("shares validating state across hooks using the same key", async () => {
    const key = `shared-validating-${Date.now()}`;
    let resolveValue!: (value: string) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveValue = resolve;
        }),
    );

    const first = runComposable(() => useSWRV<string>(key, fetcher));
    const second = runComposable(() => useSWRV<string>(key, fetcher));

    await flush();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first.isValidating.value).toBe(true);
    expect(second.isValidating.value).toBe(true);

    resolveValue("done");
    await settle();

    expect(first.data.value).toBe("done");
    expect(second.data.value).toBe("done");
    expect(first.isValidating.value).toBe(false);
    expect(second.isValidating.value).toBe(false);
  });

  it("resets validating state across hooks when a shared request errors", async () => {
    const key = `shared-validating-error-${Date.now()}`;
    let rejectValue!: (reason?: unknown) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((_resolve, reject) => {
          rejectValue = reject;
        }),
    );

    const first = runComposable(() => useSWRV<string, Error>(key, fetcher));
    const second = runComposable(() => useSWRV<string, Error>(key, fetcher));

    await flush();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first.isValidating.value).toBe(true);
    expect(second.isValidating.value).toBe(true);

    rejectValue(new Error("boom"));
    await settle();

    expect(first.error.value?.message).toBe("boom");
    expect(second.error.value?.message).toBe("boom");
    expect(first.isValidating.value).toBe(false);
    expect(second.isValidating.value).toBe(false);
  });

  it("keeps the latest key result when an older request resolves later", async () => {
    vi.useFakeTimers();

    const baseKey = `key-race-${Date.now()}`;
    const current = ref("long");

    const state = runComposable(() =>
      useSWRV<string, unknown, string>(
        () => `${baseKey}-${current.value}`,
        async (resolvedKey: string) =>
          await new Promise<string>((resolve) => {
            setTimeout(
              () => {
                resolve(resolvedKey.endsWith("long") ? "long request" : "short request");
              },
              resolvedKey.endsWith("long") ? 100 : 50,
            );
          }),
        {
          dedupingInterval: 0,
        },
      ),
    );

    await flush();
    current.value = "short";
    await flush();

    await vi.advanceTimersByTimeAsync(60);
    await settle();
    expect(state.data.value).toBe("short request");

    await vi.advanceTimersByTimeAsync(60);
    await settle();
    expect(state.data.value).toBe("short request");
  });

  it("clears displayed data when the key changes and keepPreviousData is disabled", async () => {
    vi.useFakeTimers();

    const baseKey = `key-clear-${Date.now()}`;
    const sample = ref(0);

    const state = runComposable(() =>
      useSWRV<string, unknown, string>(
        () => `${baseKey}-${sample.value}`,
        async (resolvedKey: string) =>
          await new Promise<string>((resolve) => {
            setTimeout(() => {
              resolve(resolvedKey);
            }, 100);
          }),
        {
          dedupingInterval: 0,
        },
      ),
    );

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(state.data.value).toBe(`${baseKey}-0`);

    sample.value = 1;
    await flush();

    expect(state.data.value).toBeUndefined();
    expect(state.isLoading.value).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(state.data.value).toBe(`${baseKey}-1`);
  });

  it("does not set loading while manually revalidating existing data", async () => {
    vi.useFakeTimers();

    const key = `loading-revalidate-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<string>(
        key,
        async () =>
          await new Promise<string>((resolve) => {
            setTimeout(() => {
              resolve("data");
            }, 10);
          }),
        {
          dedupingInterval: 0,
        },
      ),
    );

    await vi.advanceTimersByTimeAsync(10);
    await settle();

    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);

    const revalidatePromise = state.mutate();
    await flush();

    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(true);

    await vi.advanceTimersByTimeAsync(10);
    await revalidatePromise;
    await settle();

    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("does not fetch when a function key throws", async () => {
    const fetcher = vi.fn(async () => "value");

    const state = runComposable(() =>
      useSWRV<string>(() => {
        throw new Error("boom");
      }, fetcher),
    );

    await settle();

    expect(fetcher).not.toHaveBeenCalled();
    expect(state.data.value).toBeUndefined();
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("keeps loading false when the key is null", async () => {
    const state = runComposable(() => useSWRV<string>(null, async () => "data"));

    await settle();

    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("dedupes deep-equal object keys across hooks", async () => {
    const fetcher = vi.fn(async () => "data");

    const first = runComposable(() => useSWRV<string>({ foo: { bar: 1 } }, fetcher));
    const second = runComposable(() => useSWRV<string>({ foo: { bar: 1 } }, fetcher));

    await settle();

    expect(first.data.value).toBe("data");
    expect(second.data.value).toBe("data");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
