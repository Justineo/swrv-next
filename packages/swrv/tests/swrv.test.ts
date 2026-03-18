import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  ref,
  type App,
  type EffectScope,
} from "vue";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  SWRVConfig,
  createSWRVClient,
  mutate,
  useSWRV,
  useSWRVImmutable,
  useSWRVInfinite,
  useSWRVMutation,
  useSWRVSubscription,
} from "../src";
import { serialize } from "../src/_internal";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

async function settle(iterations = 3) {
  for (let index = 0; index < iterations; index += 1) {
    await flush();
  }
}

async function waitForMacrotask() {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await nextTick();
}

const scopes: EffectScope[] = [];
const apps: App[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
  vi.useRealTimers();

  while (scopes.length > 0) {
    scopes.pop()?.stop();
  }

  while (apps.length > 0) {
    apps.pop()?.unmount();
  }

  while (containers.length > 0) {
    containers.pop()?.remove();
  }
});

function runComposable<T>(factory: () => T) {
  let value!: T;
  const scope = effectScope();
  scopes.push(scope);
  scope.run(() => {
    value = factory();
  });
  return value;
}

function mountWithClient(client: ReturnType<typeof createSWRVClient>, key: string) {
  let state!: ReturnType<typeof useSWRV<string>>;

  const Child = defineComponent({
    setup() {
      state = useSWRV<string>(key);
      return () => h("div", state.data.value ?? "");
    },
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);

  const app = createApp({
    render: () =>
      h(
        SWRVConfig,
        { value: { client } },
        {
          default: () => h(Child),
        },
      ),
  });

  apps.push(app);
  app.mount(container);

  return () => state;
}

function mockVisibilityState(state: DocumentVisibilityState) {
  const descriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });

  return () => {
    if (descriptor) {
      Object.defineProperty(document, "visibilityState", descriptor);
      return;
    }

    Reflect.deleteProperty(document, "visibilityState");
  };
}

describe("swrv", () => {
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

  it("keeps provider clients isolated", async () => {
    const key = "provider-isolation";
    const clientA = createSWRVClient();
    const clientB = createSWRVClient();

    const stateA = mountWithClient(clientA, key);
    const stateB = mountWithClient(clientB, key);

    const [serializedKey] = serialize(key);
    clientA.setState(
      serializedKey,
      {
        data: "alpha",
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      0,
      key,
    );

    await flush();

    expect(stateA().data.value).toBe("alpha");
    expect(stateB().data.value).toBeUndefined();
  });

  it("applies optimistic mutation updates before the remote value resolves", async () => {
    const key = `optimistic-${Date.now()}`;
    const state = runComposable(() =>
      useSWRV<string>(key, async (...args: readonly unknown[]) => `remote:${String(args[0])}`),
    );

    await flush();
    expect(state.data.value).toBe(`remote:${key}`);

    let resolveValue!: (value: string) => void;
    const mutationPromise = mutate<string>(
      key,
      new Promise<string>((resolve) => {
        resolveValue = resolve;
      }),
      {
        optimisticData: "optimistic",
        revalidate: false,
      },
    ) as Promise<string | undefined>;

    await flush();
    expect(state.data.value).toBe("optimistic");

    resolveValue("server");
    await mutationPromise;
    await flush();

    expect(state.data.value).toBe("server");
  });

  it("loads and expands infinite pages", async () => {
    const state = runComposable(() =>
      useSWRVInfinite<string>(
        (index) => ["page", index] as const,
        async (...args) => args.join(":"),
        { initialSize: 2 },
      ),
    );

    await settle();
    expect(state.data.value).toEqual(["page:0", "page:1"]);

    await state.setSize(3);
    await settle();

    expect(state.data.value).toEqual(["page:0", "page:1", "page:2"]);
  });

  it("supports mutation hooks updating cache when populateCache is enabled", async () => {
    const key = `mutation-${Date.now()}`;
    const swrv = runComposable(() => useSWRV<string>(key));
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string>(key, async (_key, { arg }) => arg),
    );

    await mutation.trigger("updated", {
      populateCache: true,
    });
    await flush();

    expect(mutation.data.value).toBe("updated");
    expect(swrv.data.value).toBe("updated");
  });

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

    scopes.pop()?.stop();
    expect(disposed).toBe(true);
  });

  it("does not fetch on the initial mount when revalidateOnMount is false", async () => {
    const fetcher = vi.fn(async () => "remote");

    const state = runComposable(() =>
      useSWRV<string>("mount-disabled", fetcher, {
        revalidateOnMount: false,
      }),
    );

    await settle();

    expect(fetcher).not.toHaveBeenCalled();
    expect(state.data.value).toBeUndefined();
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("still fetches when the key changes even if revalidateOnMount is false", async () => {
    const fetcher = vi.fn(async (...args: readonly unknown[]) => `value:${String(args[0])}`);
    const key = ref("first");

    const state = runComposable(() =>
      useSWRV<string>(() => key.value, fetcher, {
        revalidateOnMount: false,
      }),
    );

    await settle();
    expect(fetcher).not.toHaveBeenCalled();

    key.value = "second";
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenLastCalledWith("second");
    expect(state.data.value).toBe("value:second");
  });

  it("keeps fallback data idle when revalidation is disabled", async () => {
    const fetcher = vi.fn(async () => "remote");

    const state = runComposable(() =>
      useSWRV<string>("fallback-idle", fetcher, {
        fallbackData: "fallback",
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }),
    );

    await settle();

    expect(fetcher).not.toHaveBeenCalled();
    expect(state.data.value).toBe("fallback");
    expect(state.isLoading.value).toBe(false);
    expect(state.isValidating.value).toBe(false);
  });

  it("revalidates on focus by default", async () => {
    let value = 0;
    const state = runComposable(() =>
      useSWRV<number>("focus-default", async () => value++, {
        dedupingInterval: 0,
        focusThrottleInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("does not revalidate on focus when the option is disabled", async () => {
    let value = 0;
    const state = runComposable(() =>
      useSWRV<number>("focus-disabled", async () => value++, {
        dedupingInterval: 0,
        revalidateOnFocus: false,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(0);
  });

  it("throttles focus revalidation immediately after mount", async () => {
    vi.useFakeTimers();

    let value = 0;
    const state = runComposable(() =>
      useSWRV<number>("focus-throttle", async () => value++, {
        dedupingInterval: 0,
        focusThrottleInterval: 50,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    window.dispatchEvent(new Event("focus"));
    await settle();
    expect(state.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(60);
    window.dispatchEvent(new Event("focus"));
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("revalidates on reconnect by default", async () => {
    let value = 0;
    const state = runComposable(() =>
      useSWRV<number>("reconnect-default", async () => value++, {
        dedupingInterval: 0,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await waitForMacrotask();
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    await settle();

    expect(state.data.value).toBe(1);
  });

  it("does not revalidate on reconnect when the document is hidden", async () => {
    let value = 0;
    const restoreVisibility = mockVisibilityState("hidden");

    try {
      const state = runComposable(() =>
        useSWRV<number>("reconnect-hidden", async () => value++, {
          dedupingInterval: 0,
        }),
      );

      await settle();
      expect(state.data.value).toBe(0);

      await waitForMacrotask();
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
      await settle();

      expect(state.data.value).toBe(0);
    } finally {
      restoreVisibility();
    }
  });

  it("retries failed requests after errorRetryInterval", async () => {
    vi.useFakeTimers();

    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");

    const state = runComposable(() =>
      useSWRV<string>("retry", fetcher, {
        dedupingInterval: 0,
        errorRetryCount: 1,
        errorRetryInterval: 50,
      }),
    );

    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.error.value).toBeInstanceOf(Error);

    await vi.advanceTimersByTimeAsync(50);
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.data.value).toBe("recovered");
    expect(state.error.value).toBeUndefined();
  });

  it("disables polling in the immutable entry point", async () => {
    vi.useFakeTimers();

    let value = 0;
    const state = runComposable(() =>
      useSWRVImmutable<number>("immutable-refresh", async () => value++, {
        dedupingInterval: 0,
        refreshInterval: 10,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(50);
    await settle();

    expect(state.data.value).toBe(0);
    expect(value).toBe(1);
  });
});
