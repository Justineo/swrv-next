import { createSSRApp, defineComponent, h } from "vue";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { renderToString } from "@vue/server-renderer";

import {
  SWRVConfig,
  createSWRVClient,
  hydrateSWRVSnapshot,
  preload,
  serializeSWRVSnapshot,
  useSWRV,
  useSWRVImmutable,
} from "../src";
import { isServerEnvironment } from "../src/_internal/utils/env";
import { flush, mountWithConfig, settle } from "./test-utils";

describe("swrv core ssr and hydration helpers", () => {
  afterEach(() => {
    Reflect.deleteProperty(window as Window & { Deno?: string }, "Deno");
  });

  it("exposes the environment helper for server detection", () => {
    expect(isServerEnvironment()).toBe(false);

    (window as Window & { Deno?: string }).Deno = "1";

    expect(isServerEnvironment()).toBe(true);
  });

  it("serializes only populated cache data into a fallback snapshot", () => {
    const client = createSWRVClient();
    client.setState("snapshot-ready", {
      data: { id: 1, name: "Ada" },
      isLoading: false,
      isValidating: false,
    });
    client.setState("snapshot-empty", {
      error: new Error("boom"),
      isLoading: false,
      isValidating: false,
    });

    expect(serializeSWRVSnapshot(client)).toEqual({
      "snapshot-ready": { id: 1, name: "Ada" },
    });
  });

  it("hydrates a fresh client from a serialized snapshot and revalidates on mount", async () => {
    vi.useFakeTimers();

    const key = `hydrate-client-${Date.now()}`;
    const serverClient = createSWRVClient();
    serverClient.setState(key, {
      data: "seed",
      isLoading: false,
      isValidating: false,
    });

    const snapshot = serializeSWRVSnapshot(serverClient);
    const client = hydrateSWRVSnapshot(createSWRVClient(), snapshot);
    const fetcher = vi.fn(
      async () =>
        await new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve("fresh");
          }, 10);
        }),
    );

    const state = mountWithConfig(
      () =>
        useSWRV<string>(key, fetcher, {
          dedupingInterval: 0,
        }),
      { client },
    );

    await flush();
    expect(state().data.value).toBe("seed");

    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state().data.value).toBe("fresh");
  });

  it("renders hydrated snapshot data during server rendering", async () => {
    const key = `hydrate-ssr-${Date.now()}`;
    const client = hydrateSWRVSnapshot(createSWRVClient(), {
      [key]: "server-seed",
    });

    const Page = defineComponent({
      setup() {
        const state = useSWRV<string>(key, null, {
          revalidateOnMount: false,
        });
        return () => h("div", state.data.value ?? "");
      },
    });

    const app = createSSRApp({
      render: () =>
        h(
          SWRVConfig,
          {
            value: {
              client,
            },
          },
          {
            default: () => h(Page),
          },
        ),
    });

    const html = await renderToString(app);

    expect(html).toContain("server-seed");
  });

  it("renders fallback data on the server without calling the fetcher", async () => {
    (window as Window & { Deno?: string }).Deno = "1";

    const key = `server-fallback-${Date.now()}`;
    const fetcher = vi.fn(async () => "fresh");

    const Page = defineComponent({
      setup() {
        const state = useSWRV<string>(key, fetcher, {
          fallbackData: "fallback",
        });
        return () => h("div", state.data.value ?? "");
      },
    });

    const app = createSSRApp({
      render: () => h(Page),
    });

    const html = await renderToString(app);

    expect(html).toContain("fallback");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not revalidate useSWRVImmutable on the server", async () => {
    (window as Window & { Deno?: string }).Deno = "1";

    const key = `server-immutable-${Date.now()}`;
    const fetcher = vi.fn(async () => "fresh");

    const Page = defineComponent({
      setup() {
        const state = useSWRVImmutable<string>(key, fetcher);
        return () => h("div", state.data.value ?? "empty");
      },
    });

    const app = createSSRApp({
      render: () => h(Page),
    });

    const html = await renderToString(app);

    expect(html).toContain("empty");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("makes root preload a no-op on the server", () => {
    (window as Window & { Deno?: string }).Deno = "1";

    const fetcher = vi.fn(async (_key: string) => "server");
    const result = preload("server-preload", fetcher);

    expect(result).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("warns when strictServerPrefetchWarning is enabled without initial data", async () => {
    (window as Window & { Deno?: string }).Deno = "1";

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const firstKey = `warn-ssr-1-${Date.now()}`;
    const secondKey = `warn-ssr-2-${Date.now()}`;
    const skippedKey = `warn-ssr-skip-${Date.now()}`;
    const fallbackKey = `warn-ssr-fallback-${Date.now()}`;

    const Page = defineComponent({
      setup() {
        const fetcher = vi.fn(async () => "fresh");
        const skippedFetcher = vi.fn(async () => "skip");
        const fallbackFetcher = vi.fn(async () => "fallback");
        const seededFetcher = vi.fn(async () => "seeded");

        useSWRV<string>(firstKey, fetcher);
        useSWRV<string>(secondKey, fetcher);
        useSWRV<string>(skippedKey, skippedFetcher, {
          strictServerPrefetchWarning: false,
        });
        useSWRV<string>(fallbackKey, fallbackFetcher, {
          fallbackData: "fallback",
        });
        useSWRV<string>("warn-ssr-seeded", seededFetcher);

        expect(fetcher).not.toHaveBeenCalled();
        expect(skippedFetcher).not.toHaveBeenCalled();
        expect(fallbackFetcher).not.toHaveBeenCalled();
        expect(seededFetcher).not.toHaveBeenCalled();

        return () => h("div");
      },
    });

    const app = createSSRApp({
      render: () =>
        h(
          SWRVConfig,
          {
            value: {
              client: createSWRVClient(),
              strictServerPrefetchWarning: true,
              fallback: {
                "warn-ssr-seeded": "seeded",
              },
            },
          },
          {
            default: () => h(Page),
          },
        ),
    });

    await renderToString(app);

    expect(warn.mock.calls).toEqual([
      [
        `Missing pre-initiated data for serialized key "${firstKey}" during server-side rendering. Data fetching should be initiated on the server and provided to SWRV via fallback data or a hydrated snapshot. You can set "strictServerPrefetchWarning: false" to disable this warning.`,
      ],
      [
        `Missing pre-initiated data for serialized key "${secondKey}" during server-side rendering. Data fetching should be initiated on the server and provided to SWRV via fallback data or a hydrated snapshot. You can set "strictServerPrefetchWarning: false" to disable this warning.`,
      ],
    ]);
  });
});
