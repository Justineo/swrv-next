import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { createSWRVClient, useSWRV } from "../src";
import { serialize } from "../src/_internal";
import { flush, mountWithClient, runComposable, settle } from "./test-utils";

describe("swrv core shared runtime behavior", () => {
  it("dedupes concurrent requests for the same key", async () => {
    const key = "dedupe-key";
    const fetcher = vi.fn(async (...args: readonly unknown[]) => `data:${String(args[0])}`);

    const first = runComposable(() => useSWRV<string>(key, fetcher));
    const second = runComposable(() => useSWRV<string>(key, fetcher));

    await flush();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first.data.value).toBe("data:dedupe-key");
    expect(second.data.value).toBe("data:dedupe-key");
  });

  it("does not revalidate when a reactive key source invalidates but the serialized key stays the same", async () => {
    const trigger = ref(0);
    const fetcher = vi.fn(async (...args: readonly unknown[]) => args.map(String).join(":"));

    const state = runComposable(() =>
      useSWRV<string>(
        computed(() => {
          void trigger.value;
          return ["stable-key", 1] as const;
        }),
        fetcher,
        { dedupingInterval: 0 },
      ),
    );

    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.data.value).toBe("stable-key:1");

    trigger.value += 1;
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.data.value).toBe("stable-key:1");
  });

  it("uses cache listener payloads without rereading the cache for the active hook", async () => {
    const key = `listener-payload-${Date.now()}`;
    const client = createSWRVClient();
    const state = mountWithClient(client, key);
    const [serializedKey] = serialize(key);

    await flush();

    const getStateSpy = vi.spyOn(client, "getState");
    getStateSpy.mockClear();

    client.setState(
      serializedKey,
      {
        data: "payload",
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      key,
    );

    await flush();

    expect(state().data.value).toBe("payload");
    expect(getStateSpy).not.toHaveBeenCalled();
  });
});
