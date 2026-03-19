import { createApp, defineComponent, h } from "vue";
import { describe, expect, it } from "vite-plus/test";

import { SWRVConfig, createSWRVClient, useSWRV } from "../src";
import { flush, registerApp, registerContainer } from "./test-utils";

describe("swrv client cleanup behavior", () => {
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
