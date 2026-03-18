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
