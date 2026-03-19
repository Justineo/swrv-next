import { createApp, defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { SWRVConfig, preload, useSWRV, useSWRVConfig } from "../src";
import { GLOBAL_SWRV_CLIENT } from "../src/config";
import type { SWRVMiddleware } from "../src";
import {
  flush,
  mountWithConfig,
  registerApp,
  registerContainer,
  runComposable,
  settle,
} from "./test-utils";

describe("swrv preload and context behavior", () => {
  it("exposes the default config and cache through useSWRVConfig", () => {
    const config = runComposable(() => useSWRVConfig());

    expect(config.client).toBe(GLOBAL_SWRV_CLIENT);
    expect(config.cache).toBe(GLOBAL_SWRV_CLIENT.cache);
    expect(config.config).toStrictEqual(SWRVConfig.defaultValue);
    expect(config.config.initFocus).toBe(SWRVConfig.defaultValue.initFocus);
    expect(config.config.initReconnect).toBe(SWRVConfig.defaultValue.initReconnect);
  });

  it("dedupes preload requests and reuses them for the first hook fetch", async () => {
    const key = `preload-dedupe-${Date.now()}`;
    let resolveValue!: (value: string) => void;
    const fetcher = vi.fn(
      async (...args: readonly unknown[]) =>
        await new Promise<string>((resolve) => {
          resolveValue = (value) => {
            resolve(`${value}:${String(args[0])}`);
          };
        }),
    );

    const firstPreload = preload(key, fetcher);
    const secondPreload = preload(key, fetcher);
    const state = runComposable(() => useSWRV<string>(key, fetcher, { dedupingInterval: 0 }));

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveValue("seed");
    await expect(firstPreload).resolves.toBe(`seed:${key}`);
    await expect(secondPreload).resolves.toBe(`seed:${key}`);
    await settle();

    expect(state.data.value).toBe(`seed:${key}`);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("clears failed preload entries so a later preload can retry", async () => {
    const key = `preload-error-${Date.now()}`;
    let attempts = 0;
    const fetcher = vi.fn(async (_key: string) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("boom");
      }

      return "ok";
    });

    await expect(preload(key, fetcher)).rejects.toThrow("boom");
    await expect(preload(key, fetcher)).resolves.toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns sync preload values immediately while still seeding the first hook fetch", async () => {
    const key = `preload-sync-${Date.now()}`;
    let calls = 0;
    const fetcher = (_key: string) => {
      calls += 1;
      return "sync-value" as const;
    };

    const preloaded = preload(key, fetcher);
    const state = mountWithConfig(() => useSWRV(key, fetcher, { dedupingInterval: 0 }), undefined);

    expect(preloaded).toBe("sync-value");
    expect(calls).toBe(1);

    await settle();

    expect(state().data.value).toBe("sync-value");
    expect(calls).toBe(1);
  });

  it("passes resolved function keys through preload fetchers", async () => {
    const key = `preload-function-${Date.now()}`;
    const fetcher = vi.fn(async (resource: string, id: number) => `${resource}:${id}`);

    await expect(
      preload<string, readonly [string, number]>(() => [key, 1] as const, fetcher),
    ).resolves.toBe(`${key}:1`);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(key, 1);
  });

  it("supports context-scoped preload through useSWRVConfig", async () => {
    const key = `preload-context-${Date.now()}`;
    let resolveValue!: (value: string) => void;
    const fetcher = vi.fn(
      async (...args: readonly unknown[]) =>
        await new Promise<string>((resolve) => {
          resolveValue = (value) => {
            resolve(`${value}:${String(args[0])}`);
          };
        }),
    );

    const state = mountWithConfig(() => {
      const { preload: scopedPreload } = useSWRVConfig();
      void scopedPreload(key, fetcher);
      return useSWRV<string>(key, fetcher, { dedupingInterval: 0 });
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveValue("context");
    await settle();

    expect(state().data.value).toBe(`context:${key}`);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("merges nested fallback maps across SWRVConfig boundaries", async () => {
    let config!: ReturnType<typeof useSWRVConfig>["config"];

    const Child = defineComponent({
      setup() {
        config = useSWRVConfig().config;
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
                fallback: {
                  a: 1,
                  b: 1,
                },
              },
            },
            {
              default: () =>
                h(
                  SWRVConfig,
                  {
                    value: {
                      fallback: {
                        a: 2,
                        c: 2,
                      },
                    },
                  },
                  {
                    default: () => h(Child),
                  },
                ),
            },
          ),
      }),
    );

    app.mount(container);

    await flush();

    expect(config.fallback).toEqual({
      a: 2,
      b: 1,
      c: 2,
    });
  });

  it("exposes the correctly extended config from useSWRVConfig", async () => {
    let config!: ReturnType<typeof useSWRVConfig>["config"];
    const middlewareA: SWRVMiddleware = (useSWRVNext) => (key, fetcher, current) =>
      useSWRVNext(key, fetcher, current);
    const middlewareB: SWRVMiddleware = (useSWRVNext) => (key, fetcher, current) =>
      useSWRVNext(key, fetcher, current);

    const Child = defineComponent({
      setup() {
        config = useSWRVConfig().config;
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
                dedupingInterval: 1,
                fallback: {
                  a: 1,
                  b: 1,
                },
                refreshInterval: 1,
                use: [middlewareA],
              },
            },
            {
              default: () =>
                h(
                  SWRVConfig,
                  {
                    value: {
                      dedupingInterval: 2,
                      fallback: {
                        a: 2,
                        c: 2,
                      },
                      use: [middlewareB],
                    },
                  },
                  {
                    default: () => h(Child),
                  },
                ),
            },
          ),
      }),
    );

    app.mount(container);
    await flush();

    expect(config.dedupingInterval).toBe(2);
    expect(config.refreshInterval).toBe(1);
    expect(config.fallback).toEqual({
      a: 2,
      b: 1,
      c: 2,
    });
    expect(config.use).toEqual([middlewareA, middlewareB]);
  });

  it("supports functional SWRVConfig values without inheriting parent overrides", async () => {
    let config!: ReturnType<typeof useSWRVConfig>["config"];
    let parentDedupingInterval = 0;

    const Child = defineComponent({
      setup() {
        config = useSWRVConfig().config;
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
                dedupingInterval: 1,
                fallback: {
                  a: 1,
                  b: 1,
                },
                refreshInterval: 1,
              },
            },
            {
              default: () =>
                h(
                  SWRVConfig,
                  {
                    value: (parentConfig: ReturnType<typeof useSWRVConfig>["config"]) => {
                      parentDedupingInterval = parentConfig.dedupingInterval;

                      return {
                        dedupingInterval: parentConfig.dedupingInterval + 2,
                        fallback: {
                          a: 2,
                          c: 2,
                        },
                      };
                    },
                  },
                  {
                    default: () => h(Child),
                  },
                ),
            },
          ),
      }),
    );

    app.mount(container);

    await flush();

    expect(parentDedupingInterval).toBe(1);
    expect(config.dedupingInterval).toBe(3);
    expect(config.refreshInterval).toBe(0);
    expect(config.fallback).toEqual({
      a: 2,
      c: 2,
    });
  });

  it("keeps the useSWRVConfig reference stable across rerenders", async () => {
    let referenceChanges = 0;
    let currentReference: ReturnType<typeof useSWRVConfig> | undefined;

    const Child = defineComponent({
      setup() {
        const swrvConfig = useSWRVConfig();
        const counter = ref(0);

        return () =>
          h(
            "button",
            {
              onClick() {
                counter.value += 1;
              },
            },
            (() => {
              if (currentReference && currentReference !== swrvConfig) {
                referenceChanges += 1;
              } else {
                currentReference = swrvConfig;
              }

              return String(counter.value);
            })(),
          );
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
                revalidateIfStale: false,
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
                revalidateOnMount: true,
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

    const button = container.querySelector("button");
    button?.click();
    await flush();
    button?.click();
    await flush();
    button?.click();
    await flush();

    expect(referenceChanges).toBe(0);
  });
});
