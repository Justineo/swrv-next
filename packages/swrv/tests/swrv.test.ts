import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  type App,
  type EffectScope,
} from "vue";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  SWRVConfig,
  createSWRVClient,
  mutate,
  useSWRV,
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

const scopes: EffectScope[] = [];
const apps: App[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
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
});
