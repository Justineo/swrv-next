import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { mutate, unstable_serialize, useSWRV } from "../src";
import { serialize } from "../src/_internal";
import { stableHash } from "../src/_internal/utils/hash";
import { mountWithConfig, settle } from "./test-utils";

describe("swrv serialize and context behavior", () => {
  it("serializes root arguments like swr unstable_serialize", () => {
    expect(unstable_serialize([])).toBe("");
    expect(unstable_serialize(null)).toBe("");
    expect(unstable_serialize("key")).toBe("key");
    expect(unstable_serialize([1, { foo: 2, bar: 1 }, ["a", "b", "c"]])).toBe(
      stableHash([1, { foo: 2, bar: 1 }, ["a", "b", "c"]]),
    );
  });

  it("serializes vue key sources through the internal serializer", () => {
    const tuple = computed(() => ["ref-key", 1] as const);

    expect(serialize(ref("plain-ref"))).toEqual(["plain-ref", "plain-ref"]);
    expect(serialize(tuple)).toEqual([stableHash(["ref-key", 1]), ["ref-key", 1]]);
    expect(serialize(() => ({ id: 1, scope: "a" }))).toEqual([
      stableHash({ id: 1, scope: "a" }),
      { id: 1, scope: "a" },
    ]);
  });

  it("shows prefetched mutate data before mount and still revalidates after mount", async () => {
    const key = `prefetch-before-mount-${Date.now()}`;
    const fetcher = vi.fn(async () => "data");

    await mutate<string>(key, Promise.resolve("prefetch-data"));

    const state = mountWithConfig(() => useSWRV<string>(key, fetcher, { dedupingInterval: 0 }));

    expect(state().data.value).toBe("prefetch-data");

    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state().data.value).toBe("data");
  });
});
