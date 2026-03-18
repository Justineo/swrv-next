import { createApp, defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { SWRVConfig, createSWRVClient, useSWRV } from "../src";
import { serialize } from "../src/_internal";
import {
  flush,
  mountWithConfig,
  registerApp,
  registerContainer,
  runComposable,
  settle,
} from "./test-utils";

describe("swrv core refresh and compare behavior", () => {
  it("rerenders automatically on interval", async () => {
    vi.useFakeTimers();

    let value = 0;
    const state = runComposable(() =>
      useSWRV<number>(`refresh-basic-${Date.now()}`, async () => value++, {
        dedupingInterval: 100,
        refreshInterval: 200,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(200);
    await settle();
    expect(state.data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(50);
    await settle();
    expect(state.data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(150);
    await settle();
    expect(state.data.value).toBe(2);
  });

  it("dedupes requests combined with intervals", async () => {
    vi.useFakeTimers();

    let value = 0;
    const fetcher = vi.fn(async () => value++);
    const state = runComposable(() =>
      useSWRV<number>(`refresh-dedupe-${Date.now()}`, fetcher, {
        dedupingInterval: 500,
        refreshInterval: 100,
      }),
    );

    await settle();
    expect(state.data.value).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(400);
    await settle();
    expect(state.data.value).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(state.data.value).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reschedules polling when provider refreshInterval changes", async () => {
    vi.useFakeTimers();

    let value = 0;
    const interval = ref(200);
    const key = `refresh-reactive-${Date.now()}`;
    let state!: ReturnType<typeof useSWRV<number>>;

    const Child = defineComponent({
      setup() {
        state = useSWRV<number>(key, async () => value++);
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
              value: () => ({
                dedupingInterval: 0,
                refreshInterval: interval.value,
              }),
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);

    await settle();
    expect(state.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(200);
    await settle();
    expect(state.data.value).toBe(1);

    interval.value = 500;
    await settle();

    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(state.data.value).toBe(1);

    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(state.data.value).toBe(2);
  });

  it("stops polling when provider refreshInterval becomes 0", async () => {
    vi.useFakeTimers();

    let value = 0;
    const interval = ref(200);
    const key = `refresh-stop-${Date.now()}`;
    let state!: ReturnType<typeof useSWRV<number>>;

    const Child = defineComponent({
      setup() {
        state = useSWRV<number>(key, async () => value++);
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
              value: () => ({
                dedupingInterval: 0,
                refreshInterval: interval.value,
              }),
            },
            {
              default: () => h(Child),
            },
          ),
      }),
    );

    app.mount(container);

    await settle();
    expect(state.data.value).toBe(0);

    await vi.advanceTimersByTimeAsync(200);
    await settle();
    expect(state.data.value).toBe(1);

    interval.value = 0;
    await settle();

    await vi.advanceTimersByTimeAsync(400);
    await settle();
    expect(state.data.value).toBe(1);
  });

  it("supports function refreshInterval and passes updated data", async () => {
    vi.useFakeTimers();

    let value = 1;
    const refreshInterval = vi.fn((latestData?: number) => (latestData ?? 0) * 1000);
    const state = runComposable(() =>
      useSWRV<number>(`refresh-function-${Date.now()}`, async () => value++, {
        dedupingInterval: 100,
        refreshInterval,
      }),
    );

    await settle();
    expect(state.data.value).toBe(1);
    expect(refreshInterval).toHaveBeenLastCalledWith(1);

    await vi.advanceTimersByTimeAsync(1000);
    await settle();
    expect(state.data.value).toBe(2);
    expect(refreshInterval).toHaveBeenLastCalledWith(2);

    await vi.advanceTimersByTimeAsync(1000);
    await settle();
    expect(state.data.value).toBe(2);

    await vi.advanceTimersByTimeAsync(1000);
    await settle();
    expect(state.data.value).toBe(3);
    expect(refreshInterval).toHaveBeenLastCalledWith(3);
  });

  it("uses a custom compare method to preserve displayed and cached data", async () => {
    let value = 0;
    const key = `refresh-compare-${Date.now()}`;
    const client = createSWRVClient();
    const [serializedKey] = serialize(key);

    const state = mountWithConfig(
      () =>
        useSWRV<{ timestamp: number; version: string }>(
          key,
          async () => ({
            timestamp: ++value,
            version: "1.0",
          }),
          {
            compare(left, right) {
              if (left === right) {
                return true;
              }

              if (!left || !right) {
                return false;
              }

              return left.version === right.version;
            },
          },
        ),
      {
        client,
      },
    );

    await settle();
    const firstData = state().data.value;
    expect(firstData?.timestamp).toBe(1);

    await state().mutate();
    await settle();

    expect(state().data.value).toBe(firstData);
    expect(state().data.value?.timestamp).toBe(1);

    const cached = client.getState<{ timestamp: number; version: string }>(serializedKey);
    expect(cached?.data?.timestamp).toBe(1);
    expect(cached?.data).toStrictEqual({
      timestamp: 1,
      version: "1.0",
    });
  });

  it("only uses compare for data transitions, not loading-state updates", async () => {
    let resolveSecond!: (value: { timestamp: number; version: string }) => void;
    const compare = vi.fn((left, right) => left?.version === right?.version);
    const fetcher = vi
      .fn<() => Promise<{ timestamp: number; version: string }>>()
      .mockResolvedValueOnce({
        timestamp: 1,
        version: "1.0",
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const state = runComposable(() =>
      useSWRV<{ timestamp: number; version: string }>(
        `refresh-compare-loading-${Date.now()}`,
        fetcher,
        {
          dedupingInterval: 0,
          compare,
        },
      ),
    );

    await settle();
    expect(state.data.value?.timestamp).toBe(1);

    compare.mockClear();

    const mutation = state.mutate();
    await flush();

    expect(state.isValidating.value).toBe(true);
    expect(compare).not.toHaveBeenCalled();

    resolveSecond({
      timestamp: 2,
      version: "1.0",
    });
    await mutation;
    await settle();

    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenLastCalledWith(
      {
        timestamp: 1,
        version: "1.0",
      },
      {
        timestamp: 2,
        version: "1.0",
      },
    );
  });

  it("does not let an older key refresh reset the new key polling schedule", async () => {
    vi.useFakeTimers();

    const baseKey = `refresh-key-switch-${Date.now()}`;
    const current = ref("slow");
    const fetcher = vi.fn(async (resolvedKey: string) => {
      await new Promise((resolve) => {
        setTimeout(resolve, resolvedKey.endsWith("slow") ? 200 : 100);
      });
      return resolvedKey;
    });

    const state = runComposable(() =>
      useSWRV<string, unknown, string>(() => `${baseKey}-${current.value}`, fetcher, {
        dedupingInterval: 50,
        refreshInterval: 100,
      }),
    );

    await vi.advanceTimersByTimeAsync(200);
    await settle();
    expect(state.data.value).toBe(`${baseKey}-slow`);

    await vi.advanceTimersByTimeAsync(100);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith(`${baseKey}-slow`);

    current.value = "fast";
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenLastCalledWith(`${baseKey}-fast`);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(state.data.value).toBe(`${baseKey}-fast`);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher).toHaveBeenLastCalledWith(`${baseKey}-fast`);
  });

  it("does not call onSuccess for an older key after the hook switches keys", async () => {
    vi.useFakeTimers();

    const baseKey = `refresh-success-key-${Date.now()}`;
    const current = ref("slow");
    const onSuccess = vi.fn();
    const fetcher = vi.fn(async (resolvedKey: string) => {
      await new Promise((resolve) => {
        setTimeout(resolve, resolvedKey.endsWith("slow") ? 200 : 100);
      });
      return resolvedKey;
    });

    runComposable(() =>
      useSWRV<string, unknown, string>(() => `${baseKey}-${current.value}`, fetcher, {
        dedupingInterval: 50,
        onSuccess,
        refreshInterval: 100,
      }),
    );

    await vi.advanceTimersByTimeAsync(200);
    await settle();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenLastCalledWith(
      `${baseKey}-slow`,
      `${baseKey}-slow`,
      expect.objectContaining({
        refreshInterval: 100,
      }),
    );

    await vi.advanceTimersByTimeAsync(100);
    await flush();
    current.value = "fast";
    await flush();

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenLastCalledWith(
      `${baseKey}-fast`,
      `${baseKey}-fast`,
      expect.objectContaining({
        refreshInterval: 100,
      }),
    );

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(onSuccess).toHaveBeenCalledTimes(2);
  });
});
