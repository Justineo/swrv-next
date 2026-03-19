import { reactive, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { useSWRV } from "../src";
import { flush, mountWithConfig, runComposable, settle } from "./test-utils";

describe("swrv core keepPreviousData behavior", () => {
  it("keeps previous data when the key changes and keepPreviousData is enabled", async () => {
    vi.useFakeTimers();

    const baseKey = `keep-previous-${Date.now()}`;
    const key = ref(`${baseKey}-0`);
    const state = runComposable(() =>
      useSWRV<string, unknown, string>(
        () => key.value,
        async (resolvedKey: string) =>
          await new Promise<string>((resolve) => {
            setTimeout(() => {
              resolve(resolvedKey);
            }, 50);
          }),
        {
          dedupingInterval: 0,
          keepPreviousData: true,
        },
      ),
    );

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(state.data.value).toBe(`${baseKey}-0`);

    key.value = `${baseKey}-1`;
    await flush();

    expect(state.data.value).toBe(`${baseKey}-0`);
    expect(state.isLoading.value).toBe(true);

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(state.data.value).toBe(`${baseKey}-1`);
  });

  it("keeps previous data only for hooks that opt into keepPreviousData", async () => {
    vi.useFakeTimers();

    const baseKey = `keep-previous-shared-${Date.now()}`;
    const key = ref(`${baseKey}-0`);
    const fetcher = async (resolvedKey: string) =>
      await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(resolvedKey);
        }, 50);
      });

    const normal = runComposable(() =>
      useSWRV<string, unknown, string>(() => key.value, fetcher, {
        dedupingInterval: 0,
      }),
    );
    const laggy = runComposable(() =>
      useSWRV<string, unknown, string>(() => key.value, fetcher, {
        dedupingInterval: 0,
        keepPreviousData: true,
      }),
    );

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(normal.data.value).toBe(`${baseKey}-0`);
    expect(laggy.data.value).toBe(`${baseKey}-0`);

    key.value = `${baseKey}-1`;
    await flush();

    expect(normal.data.value).toBeUndefined();
    expect(laggy.data.value).toBe(`${baseKey}-0`);

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(normal.data.value).toBe(`${baseKey}-1`);
    expect(laggy.data.value).toBe(`${baseKey}-1`);
  });

  it("keeps previous data even when fallbackData exists for the next key", async () => {
    vi.useFakeTimers();

    const baseKey = `keep-previous-fallback-${Date.now()}`;
    const key = ref(`${baseKey}-0`);
    const fetcher = async (resolvedKey: string) =>
      await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(resolvedKey);
        }, 50);
      });

    const normal = runComposable(() =>
      useSWRV<string, unknown, string>(() => key.value, fetcher, {
        dedupingInterval: 0,
        fallbackData: "fallback",
      }),
    );
    const laggy = runComposable(() =>
      useSWRV<string, unknown, string>(() => key.value, fetcher, {
        dedupingInterval: 0,
        fallbackData: "fallback",
        keepPreviousData: true,
      }),
    );

    await flush();
    expect(normal.data.value).toBe("fallback");
    expect(laggy.data.value).toBe("fallback");

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(normal.data.value).toBe(`${baseKey}-0`);
    expect(laggy.data.value).toBe(`${baseKey}-0`);

    key.value = `${baseKey}-1`;
    await flush();

    expect(normal.data.value).toBe("fallback");
    expect(laggy.data.value).toBe(`${baseKey}-0`);

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(normal.data.value).toBe(`${baseKey}-1`);
    expect(laggy.data.value).toBe(`${baseKey}-1`);
  });

  it("keeps previous data while the current key revalidates back to undefined", async () => {
    vi.useFakeTimers();

    const key = `keep-previous-current-${Date.now()}`;
    let counter = 0;
    const fetcher = async () =>
      await new Promise<string>((resolve) => {
        setTimeout(() => {
          counter += 1;
          resolve(String(counter));
        }, 50);
      });

    const normal = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        dedupingInterval: 0,
      }),
    );
    const laggy = runComposable(() =>
      useSWRV<string>(key, fetcher, {
        dedupingInterval: 0,
        keepPreviousData: true,
      }),
    );

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(normal.data.value).toBe("1");
    expect(laggy.data.value).toBe("1");

    const mutation = normal.mutate(undefined);
    await flush();

    expect(normal.data.value).toBeUndefined();
    expect(laggy.data.value).toBe("1");

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(normal.data.value).toBe("2");
    expect(laggy.data.value).toBe("2");
    await mutation;
  });

  it("supports changing keepPreviousData through provider config", async () => {
    vi.useFakeTimers();

    const config = reactive({
      dedupingInterval: 0,
      keepPreviousData: false,
    });
    const baseKey = `keep-previous-provider-${Date.now()}`;
    const key = ref(`${baseKey}-0`);
    const state = mountWithConfig(
      () =>
        useSWRV<string, unknown, string>(
          () => key.value,
          async (resolvedKey: string) =>
            await new Promise<string>((resolve) => {
              setTimeout(() => {
                resolve(resolvedKey);
              }, 50);
            }),
        ),
      config,
    );

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(state().data.value).toBe(`${baseKey}-0`);

    key.value = `${baseKey}-1`;
    await flush();
    expect(state().data.value).toBeUndefined();

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(state().data.value).toBe(`${baseKey}-1`);

    config.keepPreviousData = true;
    await flush();
    key.value = `${baseKey}-2`;
    await flush();
    expect(state().data.value).toBe(`${baseKey}-1`);

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(state().data.value).toBe(`${baseKey}-2`);
  });
});
