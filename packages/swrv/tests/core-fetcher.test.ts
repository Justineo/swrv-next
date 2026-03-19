import { createApp, defineComponent, h, ref } from "vue";
import { describe, expect, it } from "vite-plus/test";

import { SWRVConfig, useSWRV } from "../src";
import { registerApp, registerContainer, runComposable, settle } from "./test-utils";

import type { SWRVConfigurationValue } from "../src";

describe("swrv core fetcher behavior", () => {
  it("accepts null, undefined, and false fetchers without starting requests", async () => {
    const key = `falsy-fetcher-${Date.now()}`;

    const withNull = runComposable(() => useSWRV<string>(key, null));
    await settle();
    expect(withNull.data.value).toBeUndefined();
    expect(withNull.isLoading.value).toBe(false);
    expect(withNull.isValidating.value).toBe(false);

    const withUndefined = runComposable(() => useSWRV<string>(key, undefined));
    await settle();
    expect(withUndefined.data.value).toBeUndefined();
    expect(withUndefined.isLoading.value).toBe(false);
    expect(withUndefined.isValidating.value).toBe(false);

    const withFalse = runComposable(() => useSWRV<string>(key, false));
    await settle();
    expect(withFalse.data.value).toBeUndefined();
    expect(withFalse.isLoading.value).toBe(false);
    expect(withFalse.isValidating.value).toBe(false);
  });

  it("uses the latest provider fetcher reference for revalidation", async () => {
    const key = `provider-fetcher-${Date.now()}`;
    const activeFetcher = ref<(...args: readonly unknown[]) => string>(() => "foo");
    const configValue: SWRVConfigurationValue<string> = () => ({
      dedupingInterval: 0,
      fetcher: activeFetcher.value,
    });
    let state!: ReturnType<typeof useSWRV<string>>;

    const Child = defineComponent({
      setup() {
        state = useSWRV<string>(key, undefined, {
          dedupingInterval: 0,
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
              value: configValue,
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);
    await settle();

    expect(state.data.value).toBe("foo");

    activeFetcher.value = () => "bar";
    await settle();
    await state.mutate();
    await settle();

    expect(state.data.value).toBe("bar");
  });
});
