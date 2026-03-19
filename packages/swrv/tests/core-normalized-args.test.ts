import { describe, expect, it } from "vite-plus/test";

import useSWRV, { useSWRVImmutable } from "../src";
import useSWRVInfinite from "../src/infinite";
import { runComposable, settle } from "./test-utils";

describe("swrv normalized public hook arguments", () => {
  it("supports useSWRV(key, config) with config.fetcher", async () => {
    const state = runComposable(() =>
      useSWRV<string>(`normalized-base-${Date.now()}`, {
        dedupingInterval: 0,
        fetcher: async (key: string) => `base:${key}`,
      }),
    );

    await settle();
    expect(state.data.value).toMatch(/^base:normalized-base-/);
  });

  it("supports useSWRVImmutable(key, config) with config.fetcher", async () => {
    const state = runComposable(() =>
      useSWRVImmutable<string>(`normalized-immutable-${Date.now()}`, {
        fetcher: async (key: string) => `immutable:${key}`,
      }),
    );

    await settle();
    expect(state.data.value).toMatch(/^immutable:normalized-immutable-/);
  });

  it("supports useSWRVInfinite(getKey, config) with config.fetcher", async () => {
    const state = runComposable(() =>
      useSWRVInfinite<string>((index) => `normalized-infinite-${index}`, {
        fetcher: async (key: string) => key.toUpperCase(),
      }),
    );

    await settle();
    expect(state.data.value).toEqual(["NORMALIZED-INFINITE-0"]);
  });
});
