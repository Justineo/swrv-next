import { createApp, defineComponent, h, ref } from "vue";
import { describe, expect, it } from "vite-plus/test";

import { SWRVConfig, useSWRV, useSWRVInfinite, useSWRVMutation, useSWRVSubscription } from "../src";
import type { SWRVMiddleware } from "../src";
import {
  flush,
  mountWithConfig,
  registerApp,
  registerContainer,
  runComposable,
  settle,
} from "./test-utils";

function createLoggerMiddleware(
  id: number,
  calls: Array<{ id: number; key: unknown; fetcher?: unknown }>,
) {
  return ((useSWRVNext) => (key, fetcher, config) => {
    calls.push({ fetcher, id, key });
    return useSWRVNext(key, fetcher, config);
  }) satisfies SWRVMiddleware;
}

describe("swrv core middleware behavior", () => {
  it("uses middleware with the original key", async () => {
    const key = `middleware-basic-${Date.now()}`;
    const calls: Array<{ id: number; key: unknown; fetcher?: unknown }> = [];

    const state = runComposable(() =>
      useSWRV<string>(key, async () => "data", {
        use: [createLoggerMiddleware(0, calls)],
      }),
    );

    await settle();

    expect(state.data.value).toBe("data");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.key).toBe(key);
  });

  it("passes original array keys to middleware", async () => {
    const key = [`middleware-array-${Date.now()}`, 1, 2] as const;
    const calls: Array<{ id: number; key: unknown; fetcher?: unknown }> = [];

    const state = runComposable(() =>
      useSWRV<string, unknown, typeof key>(key, async () => "data", {
        use: [createLoggerMiddleware(0, calls)],
      }),
    );

    await settle();

    expect(state.data.value).toBe("data");
    expect(calls[0]?.key).toEqual(key);
  });

  it("passes null fetchers through middleware", async () => {
    const calls: Array<{ id: number; key: unknown; fetcher?: unknown }> = [];

    const state = runComposable(() =>
      useSWRV<string>(`middleware-null-${Date.now()}`, null, {
        use: [createLoggerMiddleware(0, calls)],
      }),
    );

    await flush();

    expect(state.data.value).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.fetcher).toBeNull();
  });

  it("supports use from config boundaries and per-hook config in SWR order", async () => {
    const key: [string, number] = ["middleware", 1];
    const calls: Array<{ id: number; key: unknown; fetcher?: unknown }> = [];
    let state!: ReturnType<typeof useSWRV<string>>;

    const Child = defineComponent({
      setup() {
        state = useSWRV<string, unknown, [string, number]>(
          key,
          async (resource: string, id: number) => `${resource}:${id}`,
          {
            use: [createLoggerMiddleware(0, calls)],
          },
        );
        return () => h("div", state.data.value ?? "");
      },
    });

    const container = registerContainer(document.createElement("div"));
    document.body.appendChild(container);

    const app = registerApp(
      createApp({
        render: () =>
          h(
            SWRVConfig,
            { value: { use: [createLoggerMiddleware(2, calls)] } },
            {
              default: () =>
                h(
                  SWRVConfig,
                  { value: { use: [createLoggerMiddleware(1, calls)] } },
                  {
                    default: () => h(Child),
                  },
                ),
            },
          ),
      }),
    );

    app.mount(container);

    await settle();

    expect(state.data.value).toBe("middleware:1");
    expect(calls.map((call) => call.id)).toEqual([2, 1, 0]);
    expect(calls[0]?.key).toEqual(key);
  });

  it("allows middleware to rewrite keys for later middleware and the fetcher", async () => {
    const key = `middleware-rewrite-${Date.now()}`;
    const decorate =
      (character: string): SWRVMiddleware =>
      (useSWRVNext) =>
        ((resolvedKey, fetcher, config) =>
          useSWRVNext(
            `${character}${resolvedKey as string}${character}`,
            fetcher,
            config,
          )) as typeof useSWRVNext;

    const state = runComposable(() =>
      useSWRV<string, unknown, string>(key, async (resolvedKey: string) => resolvedKey, {
        use: [decorate("!"), decorate("#")],
      }),
    );

    await settle();

    expect(state.data.value).toBe(`#!${key}!#`);
  });

  it("forwards non-serialized keys to middleware", async () => {
    const key = [`middleware-forward-${Date.now()}`, { hello: "world" }] as const;
    const logger = ref(false);

    const middleware: SWRVMiddleware = (useSWRVNext) =>
      ((resolvedKey, fetcher, config) => {
        logger.value = Array.isArray(resolvedKey);

        return useSWRVNext(
          JSON.stringify(resolvedKey),
          ((serializedKey: string) => {
            if (!fetcher) {
              throw new Error("missing fetcher");
            }

            const parsedKey = JSON.parse(serializedKey) as [string, { hello: string }];
            return (fetcher as (resource: string, payload: { hello: string }) => string)(
              parsedKey[0],
              parsedKey[1],
            );
          }) as typeof fetcher,
          config,
        );
      }) as typeof useSWRVNext;

    const state = runComposable(() =>
      useSWRV<string, unknown, typeof key>(
        key,
        (_resource: string, payload: { hello: string }) => payload.hello,
        {
          use: [middleware],
        },
      ),
    );

    await settle();

    expect(logger.value).toBe(true);
    expect(state.data.value).toBe("world");
  });

  it("passes the original infinite key loader through middleware", async () => {
    const calls: Array<{ id: number; key: unknown; fetcher?: unknown }> = [];
    const resource = `page-${Date.now()}`;
    const getKey = (index: number) => (index === 0 ? ([resource, index] as const) : null);

    const state = runComposable(() =>
      useSWRVInfinite<string>(
        getKey,
        async (...args: readonly unknown[]) => `${String(args[0])}:${String(args[1])}`,
        {
          use: [createLoggerMiddleware(0, calls)],
        },
      ),
    );

    await settle();

    expect(calls.map((call) => call.key)).toEqual([getKey]);
    expect(state.data.value).toEqual([`${resource}:0`]);
  });

  it("applies middleware to mutation and subscription APIs with original keys", async () => {
    const mutationCalls: Array<{ id: number; key: unknown; fetcher?: unknown }> = [];
    const subscriptionCalls: Array<{ id: number; key: unknown; fetcher?: unknown }> = [];
    const subscriptionKey = ["subscription", 1] as const;

    const mutation = mountWithConfig(
      () =>
        useSWRVMutation<string, Error, string, string>(
          "mutation-middleware",
          async (key: string, { arg }) => `${key}:${arg}`,
          { use: [createLoggerMiddleware(0, mutationCalls)] },
        ),
      { use: [createLoggerMiddleware(1, mutationCalls)] },
    );

    const subscription = runComposable(() =>
      useSWRVSubscription<string, Error, typeof subscriptionKey>(
        subscriptionKey,
        (_resolvedKey, { next }) => {
          next(undefined, "connected");
          return () => {};
        },
        { use: [createLoggerMiddleware(0, subscriptionCalls)] },
      ),
    );

    await flush();
    await settle();

    expect(mutationCalls.map((call) => call.id)).toEqual([1, 0]);
    expect(mutationCalls[0]?.key).toBe("mutation-middleware");
    await expect(mutation().trigger("value")).resolves.toBe("mutation-middleware:value");

    expect(subscriptionCalls.map((call) => call.key)).toEqual([subscriptionKey]);
    expect(subscription.data.value).toBe("connected");
  });
});
