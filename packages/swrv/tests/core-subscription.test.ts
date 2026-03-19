import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { useSWRV, useSWRVSubscription } from "../src";
import type { SWRVSubscription } from "../src";
import { flush, runComposable, settle, stopLastScope } from "./test-utils";

describe("swrv core subscription behavior", () => {
  it("receives subscription pushes and cleans up on scope dispose", async () => {
    const key = `subscription-${Date.now()}`;
    let nextValue!: (error?: Error | null, data?: string) => void;
    let disposed = false;

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(key, (_resolvedKey, { next }) => {
        nextValue = next;
        return () => {
          disposed = true;
        };
      }),
    );

    nextValue(null, "live");
    await flush();

    expect(subscription.data.value).toBe("live");

    stopLastScope();
    expect(disposed).toBe(true);
  });

  it("supports fallback data and preserves data when subscription emits an error", async () => {
    let nextValue!: (error?: Error | null, data?: string) => void;

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(
        `subscription-fallback-${Date.now()}`,
        (_resolvedKey, { next }) => {
          nextValue = next;
          return () => {};
        },
        {
          fallbackData: "fallback",
        },
      ),
    );

    await settle();
    expect(subscription.data.value).toBe("fallback");
    expect(subscription.error.value).toBeUndefined();

    nextValue(undefined, "live");
    await settle();
    expect(subscription.data.value).toBe("live");
    expect(subscription.error.value).toBeUndefined();

    nextValue(new Error("boom"));
    await settle();
    expect(subscription.data.value).toBe("live");
    expect(subscription.error.value?.message).toBe("boom");

    nextValue(undefined, "recovered");
    await settle();
    expect(subscription.data.value).toBe("recovered");
    expect(subscription.error.value).toBeUndefined();
  });

  it("accepts mutator callbacks in subscription pushes using cached data", async () => {
    let nextValue!: (error?: Error | null, data?: string | ((current?: string) => string)) => void;

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(
        `subscription-mutator-${Date.now()}`,
        (_resolvedKey, { next }) => {
          nextValue = next;
          return () => {};
        },
        {
          fallbackData: "fallback",
        },
      ),
    );

    await settle();
    expect(subscription.data.value).toBe("fallback");

    nextValue(undefined, (current) => `${current ?? "empty"}:next`);
    await settle();

    expect(subscription.data.value).toBe("empty:next");
  });

  it("passes the original key shape to subscription handlers", async () => {
    const originalKeys: Array<readonly string[]> = [];
    const swrKey = `subscription-key-${Date.now()}`;
    const key = [swrKey] as const;

    runComposable(() =>
      useSWRVSubscription<string, Error>(
        () => key,
        (resolvedKey, { next }) => {
          const tupleKey = resolvedKey as typeof key;
          originalKeys.push(tupleKey);
          next(undefined, `${tupleKey[0]}:ok`);
          return () => {};
        },
      ),
    );

    await settle();

    expect(originalKeys).toEqual([[swrKey]]);
  });

  it("deduplicates subscriptions within the same cache boundary", async () => {
    let subscriptionCount = 0;
    const key = `subscription-dedupe-${Date.now()}`;

    runComposable(() => {
      useSWRVSubscription(key, (_key, { next }) => {
        subscriptionCount += 1;
        next(undefined, "one");
        return () => {};
      });
      useSWRVSubscription(key, (_key, { next }) => {
        next(undefined, "two");
        return () => {};
      });
      useSWRVSubscription(key, (_key, { next }) => {
        next(undefined, "three");
        return () => {};
      });
    });

    await settle();

    expect(subscriptionCount).toBe(1);
  });

  it("supports updating subscription keys without subscribing to undefined", async () => {
    const swrKey = `subscription-update-${Date.now()}`;
    const seenKeys: string[] = [];
    const key = ref<string | undefined>(undefined);

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(
        () => key.value,
        (resolvedKey, { next }) => {
          seenKeys.push(resolvedKey as string);
          next(undefined, resolvedKey as string);
          return () => {};
        },
        {
          fallbackData: "fallback",
        },
      ),
    );

    await settle();
    expect(subscription.data.value).toBe("fallback");
    expect(seenKeys).toEqual([]);

    key.value = swrKey;
    await settle();

    expect(subscription.data.value).toBe(swrKey);
    expect(seenKeys).toEqual([swrKey]);
  });

  it("supports singleton subscriptions while switching keys", async () => {
    const noop = (_value: number) => {};
    const key = ref(0);
    let emit = noop;

    const subscription = runComposable(() =>
      useSWRVSubscription<number, Error>(
        () => key.value.toString(),
        (resolvedKey, { next }) => {
          const offset = Number(resolvedKey);
          emit = (value) => {
            next(null, value + offset);
          };

          return () => {
            emit = noop;
          };
        },
      ),
    );

    emit(1);
    await settle();
    expect(subscription.data.value).toBe(1);

    key.value = 1;
    await settle();

    emit(2);
    await settle();
    expect(subscription.data.value).toBe(3);
  });

  it("does not resubscribe when a reactive key invalidates but the serialized key stays the same", async () => {
    const trigger = ref(0);
    const dispose = vi.fn();
    const subscribe = vi.fn<SWRVSubscription<string, Error>>((_resolvedKey, { next }) => {
      next(undefined, "subscription-data");
      return dispose;
    });

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(
        computed(() => {
          void trigger.value;
          return "stable-subscription-key";
        }),
        subscribe,
      ),
    );

    await settle();

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscription.data.value).toBe("subscription-data");

    trigger.value += 1;
    await settle();

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    expect(subscription.data.value).toBe("subscription-data");
  });

  it("does not conflict with normal useSWRV state for the same logical key", async () => {
    const key = `subscription-isolation-${Date.now()}`;
    let nextValue!: (error?: Error | null, data?: string) => void;

    const swrv = runComposable(() => useSWRV(key, async () => "swr"));
    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error>(key, (_resolvedKey, { next }) => {
        nextValue = next;
        return () => {};
      }),
    );

    await settle();
    expect(swrv.data.value).toBe("swr");

    nextValue(undefined, "sub");
    await settle();

    expect(subscription.data.value).toBe("sub");
    expect(swrv.data.value).toBe("swr");
  });

  it("requires subscriptions to return a dispose function", () => {
    expect(() =>
      runComposable(() =>
        useSWRVSubscription<string, Error>(
          `subscription-dispose-${Date.now()}`,
          () => "no-dispose" as unknown as () => void,
        ),
      ),
    ).toThrow("must return a function");
  });
});
