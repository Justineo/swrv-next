import { describe, expect, it } from "vite-plus/test";

import { useSWRV } from "../src";
import { runComposable, settle } from "./test-utils";

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
});
