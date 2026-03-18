import { createApp, defineComponent, h } from "vue";
import { describe, expect, it } from "vite-plus/test";

import { SWRVConfig, createSWRVClient, useSWRV, useSWRVConfig } from "../src";
import { serialize } from "../src/_internal";
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
      0,
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
                expiresAt: Number.POSITIVE_INFINITY,
                isLoading: false,
                isValidating: false,
                updatedAt: Date.now(),
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

  it("returns the provider cache from useSWRVConfig and scoped mutate updates it", async () => {
    const key = `provider-config-${Date.now()}`;
    const cache = new Map([
      [
        key,
        {
          data: "cached",
          error: undefined,
          expiresAt: Number.POSITIVE_INFINITY,
          isLoading: false,
          isValidating: false,
          updatedAt: Date.now(),
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
                          expiresAt: Number.POSITIVE_INFINITY,
                          isLoading: false,
                          isValidating: false,
                          updatedAt: Date.now(),
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
                        expiresAt: Number.POSITIVE_INFINITY,
                        isLoading: false,
                        isValidating: false,
                        updatedAt: Date.now(),
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
});
