import { computed, createApp, defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { SWRVConfig, createSWRVClient, useSWRV, useSWRVImmutable } from "../src";
import { immutable } from "../src/immutable";
import { serialize } from "../src/_internal";
import {
  flush,
  mountWithConfig,
  registerApp,
  registerContainer,
  runComposable,
  settle,
  waitForMacrotask,
  mockVisibilityState,
} from "./test-utils";

describe("swrv core config and revalidation", () => {
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

  it("keeps per-hook focus settings separate for hooks sharing the same key", async () => {
    vi.useFakeTimers();

    let stableFetches = 0;
    let focusFetches = 0;
    const key = `focus-shared-config-${Date.now()}`;
    const state = runComposable(() => {
      const stable = useSWRV<number>(
        key,
        async () =>
          await new Promise<number>((resolve) => {
            stableFetches += 1;
            setTimeout(() => {
              resolve(stableFetches);
            }, 1);
          }),
        {
          dedupingInterval: 50,
          focusThrottleInterval: 0,
          revalidateOnFocus: false,
        },
      );
      const refreshing = useSWRV<number>(
        key,
        async () =>
          await new Promise<number>((resolve) => {
            focusFetches += 1;
            setTimeout(() => {
              resolve(100 + focusFetches);
            }, 1);
          }),
        {
          dedupingInterval: 50,
          focusThrottleInterval: 0,
          revalidateOnFocus: true,
        },
      );

      return {
        refreshing,
        stable,
      };
    });

    await vi.advanceTimersByTimeAsync(1);
    await settle();

    expect(stableFetches).toBe(1);
    expect(focusFetches).toBe(0);
    expect(state.stable.data.value).toBe(1);
    expect(state.refreshing.data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(60);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(1);
    await settle();

    expect(stableFetches).toBe(1);
    expect(focusFetches).toBe(1);
    expect(state.stable.data.value).toBe(101);
    expect(state.refreshing.data.value).toBe(101);
  });

  it("reacts to provider config changes for revalidateOnFocus", async () => {
    let value = 0;
    const enabled = ref(false);
    const key = `focus-stateful-${Date.now()}`;
    let state!: ReturnType<typeof useSWRV<number>>;

    const Child = defineComponent({
      setup() {
        state = useSWRV<number>(key, async () => value++, {
          dedupingInterval: 0,
          focusThrottleInterval: 0,
        });
        return () => h("div");
      },
    });

    const container = registerContainer(document.createElement("div"));
    document.body.appendChild(container);

    const app = registerApp(
      createApp({
        render: () =>
          h(
            SWRVConfig,
            {
              value: () => ({
                revalidateOnFocus: enabled.value,
                focusThrottleInterval: 0,
              }),
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();
    expect(state.data.value).toBe(0);

    enabled.value = true;
    await settle();

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();
    expect(state.data.value).toBe(1);

    enabled.value = false;
    await settle();

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();
    expect(state.data.value).toBe(1);
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

  it("respects config.isOnline when handling focus revalidation", async () => {
    let value = 0;
    let online = true;
    const key = `focus-online-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
        focusThrottleInterval: 0,
        isOnline: () => online,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    online = false;
    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(0);

    online = true;
    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
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

  it("uses the latest provider onLoadingSlow and onSuccess callbacks", async () => {
    vi.useFakeTimers();

    const key = `provider-callbacks-success-${Date.now()}`;
    const label = ref("a");
    let observed: string | null = null;
    let resolveValue!: (value: string) => void;

    const Child = defineComponent({
      setup() {
        useSWRV<string>(
          key,
          () =>
            new Promise<string>((resolve) => {
              resolveValue = resolve;
            }),
          {
            dedupingInterval: 0,
            loadingTimeout: 50,
          },
        );

        return () => h("div");
      },
    });

    const container = registerContainer(document.createElement("div"));
    document.body.appendChild(container);

    const app = registerApp(
      createApp({
        render: () =>
          h(
            SWRVConfig,
            {
              value: () => ({
                onLoadingSlow() {
                  observed = label.value;
                },
                onSuccess() {
                  observed = label.value;
                },
              }),
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);

    await flush();
    await vi.advanceTimersByTimeAsync(60);
    await flush();
    expect(observed).toBe("a");

    label.value = "b";
    await settle();

    resolveValue("data");
    await settle();

    expect(observed).toBe("b");
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

  it("uses the latest provider onError and onErrorRetry callbacks", async () => {
    vi.useFakeTimers();

    const key = `provider-callbacks-error-${Date.now()}`;
    const label = ref("a");
    const onErrorValues: string[] = [];
    const onRetryValues: string[] = [];
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("boom-a"))
      .mockRejectedValueOnce(new Error("boom-b"))
      .mockResolvedValueOnce("recovered");

    const Child = defineComponent({
      setup() {
        useSWRV<string>(key, fetcher, {
          dedupingInterval: 0,
          errorRetryInterval: 10,
          errorRetryCount: 2,
        });

        return () => h("div");
      },
    });

    const container = registerContainer(document.createElement("div"));
    document.body.appendChild(container);

    const app = registerApp(
      createApp({
        render: () =>
          h(
            SWRVConfig,
            {
              value: () => ({
                onError() {
                  onErrorValues.push(label.value);
                },
                onErrorRetry(_error, _retryKey, _config, revalidate, retryOptions) {
                  onRetryValues.push(label.value);
                  setTimeout(() => {
                    void revalidate(retryOptions);
                  }, 25);
                },
              }),
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);

    await settle();
    expect(onErrorValues).toEqual(["a"]);
    expect(onRetryValues).toEqual(["a"]);

    label.value = "b";
    await settle();

    await vi.advanceTimersByTimeAsync(25);
    await settle();

    expect(onErrorValues).toEqual(["a", "b"]);
    expect(onRetryValues).toEqual(["a", "b"]);

    await vi.advanceTimersByTimeAsync(25);
    await settle();
  });

  it("retries failed requests after errorRetryInterval", async () => {
    vi.useFakeTimers();
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
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
    random.mockRestore();
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

  it("disables focus revalidation when using the immutable middleware", async () => {
    let value = 0;
    const key = `immutable-middleware-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<number>(key, async () => value++, {
        dedupingInterval: 0,
        focusThrottleInterval: 0,
        use: [immutable],
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(0);
    expect(value).toBe(1);
  });

  it("ignores provider refreshInterval in the immutable entry point", async () => {
    vi.useFakeTimers();

    let value = 0;
    const state = mountWithConfig(
      () =>
        useSWRVImmutable<number>("immutable-provider-refresh", async () => value++, {
          dedupingInterval: 0,
        }),
      {
        refreshInterval: 10,
      },
    );

    await settle();
    expect(state().data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(50);
    await settle();

    expect(state().data.value).toBe(0);
    expect(value).toBe(1);
  });

  it("does not revalidate when a second immutable consumer mounts with cached data", async () => {
    let value = 0;
    const key = `immutable-remount-${Date.now()}`;

    const first = runComposable(() =>
      useSWRVImmutable<number>(key, async () => value++, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(first.data.value).toBe(0);
    expect(value).toBe(1);

    const second = runComposable(() =>
      useSWRVImmutable<number>(key, async () => value++, {
        dedupingInterval: 0,
      }),
    );

    await settle();

    expect(second.data.value).toBe(0);
    expect(value).toBe(1);
  });

  it("reuses cached keys without refetching when revalidateIfStale is false", async () => {
    const fetcher = vi.fn(async (key: string) => key);
    const baseKey = `revalidate-if-stale-key-${Date.now()}`;
    const current = ref("0");

    const state = runComposable(() =>
      useSWRV<string, unknown, string>(
        computed(() => `${baseKey}-${current.value}`),
        fetcher as (key: string) => Promise<string>,
        {
          dedupingInterval: 0,
          revalidateIfStale: false,
        },
      ),
    );

    await settle();
    expect(state.data.value).toBe(`${baseKey}-0`);

    current.value = "1";
    await settle();
    expect(state.data.value).toBe(`${baseKey}-1`);

    current.value = "0";
    await settle();
    expect(state.data.value).toBe(`${baseKey}-0`);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(1, `${baseKey}-0`);
    expect(fetcher).toHaveBeenNthCalledWith(2, `${baseKey}-1`);
  });
});
