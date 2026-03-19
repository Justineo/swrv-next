import { createSSRApp, defineComponent, h } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";
import { renderToString } from "@vue/server-renderer";

import {
  SWRVConfig,
  createSWRVClient,
  hydrateSWRVSnapshot,
  serializeSWRVSnapshot,
  useSWRV,
} from "../src";
import { flush, mountWithConfig, settle } from "./test-utils";

describe("swrv core ssr and hydration helpers", () => {
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
});
