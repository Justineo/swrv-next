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
} from "../src";
import { flush, mountWithConfig, settle } from "./test-utils";

describe("swrv core ssr and hydration helpers", () => {
  afterEach(() => {
    Reflect.deleteProperty(window as Window & { Deno?: string }, "Deno");
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
    const key = `warn-ssr-${Date.now()}`;

    const Page = defineComponent({
      setup() {
        useSWRV<string>(key, async () => "fresh");
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
            },
          },
          {
            default: () => h(Page),
          },
        ),
    });

    await renderToString(app);

    expect(warn).toHaveBeenCalledWith(
      `Missing pre-initiated data for serialized key "${key}" during server-side rendering. Data fetching should be initiated on the server and provided to SWRV via fallback data or a hydrated snapshot. You can set "strictServerPrefetchWarning: false" to disable this warning.`,
    );
  });
});
