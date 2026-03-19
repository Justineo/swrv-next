import { ref } from "vue";
import * as Vue from "vue";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { useSWRV } from "../src";
import { runComposable, settle } from "./test-utils";

import type { SWRVMiddleware } from "../src";

describe("swrv core devtools middleware", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "__SWRV_DEVTOOLS_USE__");
    Reflect.deleteProperty(window, "__SWRV_DEVTOOLS_VUE__");
  });

  it("uses window.__SWRV_DEVTOOLS_USE__ as built-in middleware", async () => {
    window.__SWRV_DEVTOOLS_USE__ = [
      ((useSWRVNext) => (key, fetcher, config) => {
        const result = useSWRVNext(key, fetcher, config);
        return {
          ...result,
          data: ref("middleware"),
        };
      }) as SWRVMiddleware,
    ];

    const state = runComposable(() => useSWRV<string>(`devtools-${Date.now()}`, async () => "ok"));

    await settle();

    expect(state.data.value).toBe("middleware");
  });

  it("exposes window.__SWRV_DEVTOOLS_VUE__ as the Vue module when enabled", async () => {
    window.__SWRV_DEVTOOLS_USE__ = [];

    runComposable(() => useSWRV<string>(null, async () => "ok"));
    await settle();

    expect(window.__SWRV_DEVTOOLS_VUE__).toBe(Vue);
  });
});
