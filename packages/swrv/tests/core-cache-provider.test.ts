import { createApp, defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  SWRVConfig,
  createSWRVClient,
  mutate as globalMutate,
  preload as globalPreload,
  useSWRV,
  useSWRVConfig,
} from "../src";
import { serialize } from "../src/_internal";
import { GLOBAL_SWRV_CLIENT } from "../src/config";
import type { CacheAdapter, CacheState } from "../src/_internal/types";
import {
  flush,
  mountWithClient,
  mountWithConfig,
  registerApp,
  registerContainer,
  settle,
} from "./test-utils";

describe("swrv core cache provider behavior", () => {
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
      key,
    );

    await flush();

    expect(stateA().data.value).toBe("alpha");
    expect(stateB().data.value).toBeUndefined();
  });

  it("reads seeded provider cache values before updating from the fetcher", async () => {
    const key = `provider-seeded-${Date.now()}`;
    let resolveValue!: (value: string) => void;
    const state = mountWithConfig(
      () =>
        useSWRV<string>(
          key,
          () =>
            new Promise((resolve) => {
              resolveValue = resolve;
            }),
          {
            dedupingInterval: 0,
          },
        ),
      {
        provider: () =>
          new Map([
            [
              key,
              {
                data: "cached",
                error: undefined,
                isLoading: false,
                isValidating: false,
              },
            ],
          ]),
      },
    );

    await flush();
    expect(state().data.value).toBe("cached");

    resolveValue("updated");
    await settle();
    expect(state().data.value).toBe("updated");
  });

  it("returns the global cache and shared helpers by default", async () => {
    let captured!: ReturnType<typeof useSWRVConfig>;

    const Child = defineComponent({
      setup() {
        captured = useSWRVConfig();
        return () => h("div");
      },
    });

    const container = registerContainer(document.createElement("div"));
    document.body.appendChild(container);

    const app = registerApp(
      createApp({
        render: () => h(Child),
      }),
    );

    app.mount(container);
    await flush();

    expect(captured.cache).toBe(GLOBAL_SWRV_CLIENT.cache);
    expect(captured.client).toBe(GLOBAL_SWRV_CLIENT);
    expect(captured.mutate).toBe(globalMutate);
    expect(captured.preload).toBe(globalPreload);
  });

  it("returns the provider cache from useSWRVConfig and scoped mutate updates it", async () => {
    const key = `provider-config-${Date.now()}`;
    const cache = new Map([
      [
        key,
        {
          data: "cached",
          error: undefined,
          isLoading: false,
          isValidating: false,
        },
      ],
    ]);

    const state = mountWithConfig(
      () => {
        const config = useSWRVConfig();
        const swrv = useSWRV<string>(key, null);
        return {
          cache: config.cache,
          mutate: config.mutate,
          swrv,
        };
      },
      {
        provider: () => cache,
      },
    );

    await flush();

    expect(state().cache).toBe(cache);
    expect(state().swrv.data.value).toBe("cached");

    await state().mutate(key, "mutated", false);
    await flush();

    expect(state().swrv.data.value).toBe("mutated");
    expect(cache.get(key)?.data).toBe("mutated");
  });

  it("supports fallback values with a custom provider", async () => {
    const key = `provider-fallback-${Date.now()}`;
    const state = mountWithConfig(
      () =>
        useSWRV<string>(
          key,
          async () => {
            await Promise.resolve();
            return "data";
          },
          {
            dedupingInterval: 0,
          },
        ),
      {
        fallback: { [key]: "fallback" },
        provider: () => new Map(),
      },
    );

    expect(state().data.value).toBe("fallback");
    expect(state().isLoading.value).toBe(true);

    await settle();
    expect(state().data.value).toBe("data");
    expect(state().isLoading.value).toBe(false);
  });

  it("prefers provider cache data over fallback values", async () => {
    const key = `provider-fallback-cache-${Date.now()}`;
    const state = mountWithConfig(
      () =>
        useSWRV<string>(
          key,
          async () => {
            await Promise.resolve();
            return "data";
          },
          {
            dedupingInterval: 0,
          },
        ),
      {
        fallback: { [key]: "fallback" },
        provider: () =>
          new Map([
            [
              key,
              {
                data: "cache",
                error: undefined,
                isLoading: false,
                isValidating: false,
              },
            ],
          ]),
      },
    );

    expect(state().data.value).toBe("cache");

    await settle();
    expect(state().data.value).toBe("data");
  });

  it("supports nested provider boundaries with isolated values", async () => {
    const key = `provider-nested-${Date.now()}`;
    let outer!: ReturnType<typeof useSWRV<string>>;
    let inner!: ReturnType<typeof useSWRV<string>>;

    const Inner = defineComponent({
      setup() {
        inner = useSWRV<string>(key, null);
        return () => h("span", inner.data.value ?? "");
      },
    });

    const Outer = defineComponent({
      setup() {
        outer = useSWRV<string>(key, null);
        return () =>
          h("div", [
            h("span", outer.data.value ?? ""),
            h(
              SWRVConfig,
              {
                value: {
                  provider: () =>
                    new Map([
                      [
                        key,
                        {
                          data: "inner",
                          error: undefined,
                          isLoading: false,
                          isValidating: false,
                        },
                      ],
                    ]),
                },
              },
              {
                default: () => h(Inner),
              },
            ),
          ]);
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
              value: {
                provider: () =>
                  new Map([
                    [
                      key,
                      {
                        data: "outer",
                        error: undefined,
                        isLoading: false,
                        isValidating: false,
                      },
                    ],
                  ]),
              },
            },
            {
              default: () => h(Outer),
            },
          ),
      }),
    );

    app.mount(container);

    await flush();

    expect(outer.data.value).toBe("outer");
    expect(inner.data.value).toBe("inner");
  });

  it("retains the correct fallback hierarchy across config boundaries", async () => {
    vi.useFakeTimers();

    const key = `provider-hierarchy-${Date.now()}`;
    const fetcher = vi.fn(
      async () =>
        await new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve("data");
          }, 10);
        }),
    );

    const Root = defineComponent({
      setup() {
        const outer = useSWRV<string>(key, fetcher, {
          dedupingInterval: 0,
        });

        return () =>
          h("div", [
            h("span", { id: "outer" }, outer.data.value ?? "undefined"),
            h(
              SWRVConfig,
              {
                value: {
                  fallback: {
                    [key]: "fallback",
                  },
                },
              },
              {
                default: () =>
                  h(
                    defineComponent({
                      setup() {
                        const inner = useSWRV<string>(key, fetcher, {
                          dedupingInterval: 0,
                        });
                        return () => h("span", { id: "inner" }, inner.data.value ?? "undefined");
                      },
                    }),
                  ),
              },
            ),
            h(
              defineComponent({
                setup() {
                  const sibling = useSWRV<string>(key, fetcher, {
                    dedupingInterval: 0,
                  });
                  return () => h("span", { id: "sibling" }, sibling.data.value ?? "undefined");
                },
              }),
            ),
          ]);
      },
    });

    const container = registerContainer(document.createElement("div"));
    document.body.appendChild(container);

    const app = registerApp(
      createApp({
        render: () => h(Root),
      }),
    );

    app.mount(container);
    await flush();

    expect(container.querySelector("#outer")?.textContent).toBe("undefined");
    expect(container.querySelector("#inner")?.textContent).toBe("fallback");
    expect(container.querySelector("#sibling")?.textContent).toBe("undefined");

    await vi.advanceTimersByTimeAsync(10);
    await settle();

    expect(container.querySelector("#outer")?.textContent).toBe("data");
    expect(container.querySelector("#inner")?.textContent).toBe("data");
    expect(container.querySelector("#sibling")?.textContent).toBe("data");
  });

  it("can extend the parent cache through provider(parentCache)", async () => {
    const key = `provider-extend-${Date.now()}`;
    let capturedParentCache: CacheAdapter<CacheState<string, unknown>> | undefined;

    const state = mountWithConfig(
      () =>
        useSWRV<string>(
          key,
          async () => {
            await Promise.resolve();
            return "data";
          },
          {
            dedupingInterval: 0,
          },
        ),
      {
        provider: (parentCache: CacheAdapter<CacheState<string, unknown>>) => {
          capturedParentCache = parentCache;

          return {
            delete(cacheKey: string) {
              parentCache.delete(cacheKey);
            },
            get(cacheKey: string) {
              const value = parentCache.get(cacheKey);
              if (value?.data !== undefined) {
                return {
                  ...value,
                  data: `${value.data}-extended`,
                };
              }

              return value;
            },
            keys() {
              return parentCache.keys();
            },
            set(cacheKey: string, value: CacheState<string, unknown>) {
              parentCache.set(cacheKey, value);
            },
          };
        },
      },
    );

    await flush();
    expect(capturedParentCache).toBeDefined();

    await settle();
    expect(state().data.value).toBe("data-extended");
  });

  it("does not recreate the cache provider when the parent rerenders", async () => {
    const createProvider = vi.fn(() => new Map());

    const Child = defineComponent({
      setup() {
        const count = ref(0);

        return () => h("button", { onClick: () => (count.value += 1) }, String(count.value));
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
              value: {
                provider: () => createProvider(),
              },
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);
    await flush();

    expect(createProvider).toHaveBeenCalledTimes(1);

    const button = container.querySelector("button");
    button?.click();
    await flush();

    expect(createProvider).toHaveBeenCalledTimes(1);
  });

  it("reuses the same cache instance after remounting SWRVConfig", async () => {
    const cacheSingleton = new Map([
      [
        "key",
        {
          data: "value",
          error: undefined,
          isLoading: false,
          isValidating: false,
        },
      ],
    ]);
    let focusRegistered = false;

    const Content = defineComponent({
      setup() {
        const config = useSWRVConfig();
        return () => {
          const cachedData = config.cache.get("key")?.data;
          return h("div", typeof cachedData === "string" ? cachedData : "");
        };
      },
    });

    const Wrapper = defineComponent({
      setup() {
        const mounted = ref(true);

        return () =>
          h("div", [
            h(
              "button",
              {
                onClick: () => {
                  mounted.value = !mounted.value;
                },
              },
              "toggle",
            ),
            mounted.value
              ? h(
                  SWRVConfig,
                  {
                    value: {
                      provider: () => cacheSingleton,
                      initFocus: () => {
                        focusRegistered = true;
                        return () => {
                          focusRegistered = false;
                        };
                      },
                    },
                  },
                  {
                    default: () => h(Content),
                  },
                )
              : null,
          ]);
      },
    });

    const container = registerContainer(document.createElement("div"));
    document.body.appendChild(container);

    const app = registerApp(
      createApp({
        render: () => h(Wrapper),
      }),
    );

    app.mount(container);
    await flush();

    expect(container.textContent).toContain("value");
    expect(focusRegistered).toBe(true);

    const button = container.querySelector("button");
    button?.click();
    await flush();
    button?.click();
    await flush();

    expect(container.textContent).toContain("value");
    expect(focusRegistered).toBe(true);
  });

  it("binds custom initFocus and initReconnect without replacing the parent cache", async () => {
    const key = `provider-events-no-boundary-${Date.now()}`;
    const initFocus = vi.fn();
    const initReconnect = vi.fn();
    const fetcher = vi.fn(async () => "value");
    let cache!: CacheAdapter<CacheState<any, any>>;

    mountWithConfig(
      () => {
        cache = useSWRVConfig().cache;
        return useSWRV<string>(key, fetcher);
      },
      {
        initFocus,
        initReconnect,
      },
    );

    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(initFocus).toHaveBeenCalledTimes(1);
    expect(initReconnect).toHaveBeenCalledTimes(1);
    expect(cache).toBe(GLOBAL_SWRV_CLIENT.cache);
  });

  it("uses custom focus and reconnect initializers when a provider reuses the parent cache", async () => {
    const key = `provider-events-${Date.now()}`;
    const focusCallbacks: Array<() => void> = [];
    const reconnectCallbacks: Array<() => void> = [];
    const disposeFocus = vi.fn();
    const disposeReconnect = vi.fn();
    const initFocus = vi.fn((callback: () => void) => {
      focusCallbacks.push(callback);
      return () => {
        const index = focusCallbacks.indexOf(callback);
        if (index >= 0) {
          focusCallbacks.splice(index, 1);
        }

        disposeFocus();
      };
    });
    const initReconnect = vi.fn((callback: () => void) => {
      reconnectCallbacks.push(callback);
      return () => {
        const index = reconnectCallbacks.indexOf(callback);
        if (index >= 0) {
          reconnectCallbacks.splice(index, 1);
        }

        disposeReconnect();
      };
    });
    const fetcher = vi.fn(async () => `value:${fetcher.mock.calls.length}`);

    let state!: ReturnType<typeof useSWRV<string>>;
    let cache!: CacheAdapter<CacheState<any, any>>;
    let childClient!: ReturnType<typeof useSWRVConfig>["client"];

    const Child = defineComponent({
      setup() {
        const access = useSWRVConfig();
        cache = access.cache;
        childClient = access.client;
        state = useSWRV<string>(key, fetcher, {
          dedupingInterval: 0,
          focusThrottleInterval: 0,
        });

        return () => h("div", state.data.value ?? "");
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
              value: {
                provider: (parentCache: CacheAdapter<CacheState<any, any>>) => parentCache,
                initFocus,
                initReconnect,
              },
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(initFocus).toHaveBeenCalledTimes(1);
    expect(initReconnect).toHaveBeenCalledTimes(1);
    expect(cache).toBe(GLOBAL_SWRV_CLIENT.cache);
    expect(childClient).toBe(GLOBAL_SWRV_CLIENT);

    focusCallbacks[0]?.();
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(2);

    reconnectCallbacks[0]?.();
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(3);

    app.unmount();

    expect(disposeFocus).toHaveBeenCalledTimes(1);
    expect(disposeReconnect).toHaveBeenCalledTimes(1);
    expect(focusCallbacks).toHaveLength(0);
    expect(reconnectCallbacks).toHaveLength(0);
  });

  it("uses custom focus and reconnect initializers when a provider creates a child boundary", async () => {
    const key = `provider-events-child-${Date.now()}`;
    const focusCallbacks: Array<() => void> = [];
    const reconnectCallbacks: Array<() => void> = [];
    const disposeFocus = vi.fn();
    const disposeReconnect = vi.fn();
    const initFocus = vi.fn((callback: () => void) => {
      focusCallbacks.push(callback);
      return () => {
        const index = focusCallbacks.indexOf(callback);
        if (index >= 0) {
          focusCallbacks.splice(index, 1);
        }

        disposeFocus();
      };
    });
    const initReconnect = vi.fn((callback: () => void) => {
      reconnectCallbacks.push(callback);
      return () => {
        const index = reconnectCallbacks.indexOf(callback);
        if (index >= 0) {
          reconnectCallbacks.splice(index, 1);
        }

        disposeReconnect();
      };
    });
    const fetcher = vi.fn(async () => `value:${fetcher.mock.calls.length}`);

    let cache!: CacheAdapter<CacheState<any, any>>;
    let childClient!: ReturnType<typeof useSWRVConfig>["client"];

    const Child = defineComponent({
      setup() {
        const access = useSWRVConfig();
        cache = access.cache;
        childClient = access.client;

        useSWRV<string>(key, fetcher, {
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
              value: {
                provider: () => new Map(),
                initFocus,
                initReconnect,
              },
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(initFocus).toHaveBeenCalledTimes(1);
    expect(initReconnect).toHaveBeenCalledTimes(1);
    expect(cache).not.toBe(GLOBAL_SWRV_CLIENT.cache);
    expect(childClient).not.toBe(GLOBAL_SWRV_CLIENT);

    focusCallbacks[0]?.();
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(2);

    reconnectCallbacks[0]?.();
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(3);

    app.unmount();

    expect(disposeFocus).toHaveBeenCalledTimes(1);
    expect(disposeReconnect).toHaveBeenCalledTimes(1);
    expect(focusCallbacks).toHaveLength(0);
    expect(reconnectCallbacks).toHaveLength(0);
  });

  it("exposes the merged baseline through SWRVConfig.defaultValue", () => {
    expect(SWRVConfig.defaultValue.compare("left", "left")).toBe(true);
    expect(SWRVConfig.defaultValue.dedupingInterval).toBe(2000);
    expect(typeof SWRVConfig.defaultValue.initFocus).toBe("function");
    expect(typeof SWRVConfig.defaultValue.initReconnect).toBe("function");
    expect(SWRVConfig.defaultValue.revalidateOnFocus).toBe(true);
    expect(SWRVConfig.defaultValue.revalidateOnReconnect).toBe(true);
  });
});
