import { createApp, defineComponent, h } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { SWRVConfig, createSWRVClient, useSWRV } from "../src";
import { flush, mountWithConfig, registerApp, registerContainer, settle } from "./test-utils";

describe("swrv ttl and lifecycle behavior", () => {
  it("keeps ttl=0 cache entries available to later consumers", async () => {
    vi.useFakeTimers();

    const client = createSWRVClient();
    const key = `ttl-zero-${Date.now()}`;
    let count = 0;

    const first = mountWithConfig(
      () =>
        useSWRV<number>(key, async () => ++count, {
          ttl: 0,
          dedupingInterval: 0,
        }),
      { client },
    );

    await settle();
    expect(first().data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(100_000);
    await settle();

    const second = mountWithConfig(() => useSWRV<number>(key), { client });
    await flush();

    expect(second().data.value).toBe(1);
    expect(count).toBe(1);
  });

  it("expires positive ttl cache entries for later consumers", async () => {
    vi.useFakeTimers();

    const client = createSWRVClient();
    const key = `ttl-expire-${Date.now()}`;
    let count = 0;

    const first = mountWithConfig(
      () =>
        useSWRV<number>(key, async () => ++count, {
          ttl: 100,
          dedupingInterval: 0,
        }),
      { client },
    );

    await settle();
    expect(first().data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(150);
    await settle();

    const second = mountWithConfig(() => useSWRV<number>(key), { client });
    await flush();

    expect(second().data.value).toBeUndefined();
    expect(count).toBe(1);
  });

  it("stores resolved data even when the loading entry ttl expires before the request settles", async () => {
    vi.useFakeTimers();

    const key = `ttl-inflight-${Date.now()}`;
    const state = mountWithConfig(() =>
      useSWRV<string>(
        key,
        async () =>
          await new Promise<string>((resolve) => {
            setTimeout(() => {
              resolve("data");
            }, 100);
          }),
        {
          ttl: 50,
          dedupingInterval: 0,
        },
      ),
    );

    await flush();
    expect(state().data.value).toBeUndefined();
    expect(state().isValidating.value).toBe(true);

    await vi.advanceTimersByTimeAsync(75);
    await flush();
    expect(state().data.value).toBeUndefined();
    expect(state().isValidating.value).toBe(true);

    await vi.advanceTimersByTimeAsync(25);
    await settle();

    expect(state().data.value).toBe("data");
    expect(state().isValidating.value).toBe(false);
  });

  it("removes client listeners and revalidators when a component unmounts", async () => {
    const client = createSWRVClient();
    const key = `cleanup-${Date.now()}`;

    const Child = defineComponent({
      setup() {
        useSWRV<string>(key);
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
            { value: { client } },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);
    await flush();

    expect(client.state.listeners.get(key)?.size).toBe(1);
    expect(client.state.revalidators.get(key)?.size).toBe(1);

    app.unmount();

    expect(client.state.listeners.get(key)).toBeUndefined();
    expect(client.state.revalidators.get(key)).toBeUndefined();
  });

  it("keeps other client listeners and revalidators when one consumer unmounts", async () => {
    const client = createSWRVClient();
    const key = `cleanup-shared-${Date.now()}`;

    const Child = defineComponent({
      setup() {
        useSWRV<string>(key);
        return () => h("div");
      },
    });

    const mountConsumer = () => {
      const container = registerContainer(document.createElement("div"));
      document.body.appendChild(container);

      const app = registerApp(
        createApp({
          render: () =>
            h(
              SWRVConfig,
              { value: { client } },
              {
                default: () => h(Child),
              },
            ),
        }),
      );

      app.mount(container);
      return app;
    };

    const first = mountConsumer();
    const second = mountConsumer();
    await flush();

    expect(client.state.listeners.get(key)?.size).toBe(2);
    expect(client.state.revalidators.get(key)?.size).toBe(2);

    first.unmount();

    expect(client.state.listeners.get(key)?.size).toBe(1);
    expect(client.state.revalidators.get(key)?.size).toBe(1);

    second.unmount();

    expect(client.state.listeners.get(key)).toBeUndefined();
    expect(client.state.revalidators.get(key)).toBeUndefined();
  });
});
