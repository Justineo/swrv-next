import { ref } from "vue";
import { describe, expect, it, vi } from "vite-plus/test";

import { useSWRV, useSWRVMutation } from "../src";
import type { SWRVMutationConfiguration } from "../src";
import { flush, runComposable, settle, waitForMacrotask } from "./test-utils";

describe("swrv core mutation behavior", () => {
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

  it("passes the original key and trigger arg through mutation fetchers", async () => {
    const key = [`mutation-args-${Date.now()}`, "arg0"] as const;
    const fetcher = vi.fn(
      async (resolvedKey: typeof key, { arg }: { arg: string }) =>
        `${resolvedKey[0]}:${resolvedKey[1]}:${arg}`,
    );
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string, typeof key>(key, fetcher),
    );

    await expect(mutation.trigger("arg1")).resolves.toBe(`${key[0]}:${key[1]}:arg1`);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(key, { arg: "arg1" });
  });

  it("calls mutation onSuccess from hook config", async () => {
    const key = `mutation-success-${Date.now()}`;
    const onSuccess = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => "data", {
        onSuccess,
      }),
    );

    await expect(mutation.trigger(undefined)).resolves.toBe("data");
    await settle();

    expect(mutation.data.value).toBe("data");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0]?.[0]).toBe("data");
    expect(onSuccess.mock.calls[0]?.[1]).toBe(key);
  });

  it("supports configuring mutation onSuccess per trigger", async () => {
    const key = `mutation-success-trigger-${Date.now()}`;
    const onSuccess = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => "data"),
    );

    await expect(mutation.trigger(undefined, { onSuccess })).resolves.toBe("data");
    await settle();

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0]?.[0]).toBe("data");
    expect(onSuccess.mock.calls[0]?.[1]).toBe(key);
  });

  it("calls mutation onError and throws by default", async () => {
    const key = `mutation-throw-${Date.now()}`;
    const onError = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        key,
        async () => {
          throw new Error("boom");
        },
        {
          onError,
        },
      ),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("boom");
    await settle();

    expect(mutation.error.value?.message).toBe("boom");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[1]).toBe(key);
  });

  it("passes the current cached value to mutation populateCache transforms", async () => {
    const key = `mutation-populate-transform-${Date.now()}`;
    const swrv = runComposable(() => useSWRV<string>(key));
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string>(key, async (_key, { arg }) => arg),
    );

    await swrv.mutate("current", { revalidate: false });
    await mutation.trigger("next", {
      populateCache: (result, current) => `${current}:${result}`,
      revalidate: false,
    });
    await settle();

    expect(mutation.data.value).toBe("next");
    expect(swrv.data.value).toBe("current:next");
  });

  it("does not throw mutation errors when throwOnError is false", async () => {
    const key = `mutation-no-throw-${Date.now()}`;
    const onError = vi.fn();

    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        key,
        async () => {
          throw new Error("boom");
        },
        {
          onError,
          throwOnError: false,
        },
      ),
    );

    await expect(mutation.trigger(undefined)).resolves.toBeUndefined();
    expect(mutation.error.value).toBeInstanceOf(Error);
    expect(mutation.error.value?.message).toBe("boom");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("tracks isMutating while a mutation request is in flight", async () => {
    const key = `mutation-pending-${Date.now()}`;
    let resolveMutation!: (value: string) => void;
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        key,
        async () =>
          await new Promise<string>((resolve) => {
            resolveMutation = resolve;
          }),
      ),
    );

    const mutationPromise = mutation.trigger(undefined);
    await flush();
    expect(mutation.isMutating.value).toBe(true);

    resolveMutation("data");
    await expect(mutationPromise).resolves.toBe("data");
    await settle();

    expect(mutation.data.value).toBe("data");
    expect(mutation.isMutating.value).toBe(false);
  });

  it("does not read shared useSWRV cache into mutation-local state", async () => {
    const key = `mutation-cache-isolation-${Date.now()}`;
    const swrv = runComposable(() => useSWRV<string>(key, async () => "data"));
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => "wrong"),
    );

    await settle();

    expect(swrv.data.value).toBe("data");
    expect(mutation.data.value).toBeUndefined();
  });

  it("supports function revalidate in mutation trigger options", async () => {
    const key = `mutation-revalidate-fn-${Date.now()}`;
    let value = 0;
    const fetcher = vi.fn(async () => ++value);

    const swrv = runComposable(() =>
      useSWRV<number>(key, fetcher, {
        dedupingInterval: 0,
      }),
    );
    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, void, string>(key, async () => {
        value += 10;
        return value;
      }),
    );

    await settle();
    expect(swrv.data.value).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const options: SWRVMutationConfiguration<number, Error, void, string, number> = {
      populateCache: true,
      revalidate: (data, currentKey) => currentKey === key && (data ?? 0) < 30,
    };

    await mutation.trigger(undefined, options);
    await settle();
    expect(swrv.data.value).toBe(12);
    expect(fetcher).toHaveBeenCalledTimes(2);

    await mutation.trigger(undefined, options);
    await settle();
    expect(swrv.data.value).toBe(23);
    expect(fetcher).toHaveBeenCalledTimes(3);

    await mutation.trigger(undefined, options);
    await settle();
    expect(swrv.data.value).toBe(33);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("supports optimistic shared-cache updates through mutation hooks", async () => {
    const key = `mutation-optimistic-${Date.now()}`;
    const swrv = runComposable(() =>
      useSWRV<string[]>(key, async () => ["foo"], {
        dedupingInterval: 0,
      }),
    );
    let resolveMutation!: (value: string) => void;
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, string, string, string[]>(
        key,
        async (_key, { arg }) =>
          await new Promise<string>((resolve) => {
            resolveMutation = () => resolve(arg.toUpperCase());
          }),
      ),
    );

    await settle();
    expect(swrv.data.value).toEqual(["foo"]);

    const mutationPromise = mutation.trigger<string[]>("bar", {
      optimisticData: (current) => [...(current ?? []), "bar"],
      populateCache: (result, current) => [...(current ?? []), result],
      revalidate: false,
    });

    await flush();
    expect(swrv.data.value).toEqual(["foo", "bar"]);

    resolveMutation("BAR");
    await expect(mutationPromise).resolves.toBe("BAR");
    await settle();

    expect(swrv.data.value).toEqual(["foo", "BAR"]);
  });

  it("does not dedupe repeated mutation triggers", async () => {
    const key = `mutation-no-dedupe-${Date.now()}`;
    const calls = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(key, async () => {
        calls();
        await waitForMacrotask();
        return "data";
      }),
    );

    const first = mutation.trigger(undefined);
    const second = mutation.trigger(undefined);
    const third = mutation.trigger(undefined);
    await flush();

    expect(calls).toHaveBeenCalledTimes(3);

    await expect(first).resolves.toBe("data");
    await expect(second).resolves.toBe("data");
    await expect(third).resolves.toBe("data");
  });

  it("always uses the latest mutation fetcher closure state", async () => {
    const key = `mutation-latest-fetcher-${Date.now()}`;
    const count = ref(0);
    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, void>(key, async () => count.value),
    );

    await expect(mutation.trigger(undefined)).resolves.toBe(0);
    await settle();
    expect(mutation.data.value).toBe(0);

    count.value = 1;
    await expect(mutation.trigger(undefined)).resolves.toBe(1);
    await settle();
    expect(mutation.data.value).toBe(1);
  });

  it("always uses the latest mutation config closure state", async () => {
    const key = `mutation-latest-config-${Date.now()}`;
    const count = ref(0);
    const logs: number[] = [];
    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, void>(key, async () => count.value, {
        onSuccess() {
          logs.push(count.value);
        },
      }),
    );

    await expect(mutation.trigger(undefined)).resolves.toBe(0);
    await settle();
    expect(logs).toEqual([0]);

    count.value = 1;
    await expect(mutation.trigger(undefined)).resolves.toBe(1);
    await settle();
    expect(logs).toEqual([0, 1]);
  });

  it("can reset mutation-local state", async () => {
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>("mutation-reset", async () => "updated"),
    );

    await mutation.trigger(undefined);
    await settle();

    expect(mutation.data.value).toBe("updated");

    mutation.reset();

    expect(mutation.data.value).toBeUndefined();
    expect(mutation.error.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(false);
  });

  it("ignores stale mutation results after reset()", async () => {
    let resolveMutation!: (value: string) => void;
    const onSuccess = vi.fn();

    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(
        "mutation-reset-race",
        async () =>
          await new Promise<string>((resolve) => {
            resolveMutation = resolve;
          }),
      ),
    );

    const resultPromise = mutation.trigger(undefined, { onSuccess });
    await flush();

    mutation.reset();
    resolveMutation("updated");
    await settle();

    await expect(resultPromise).resolves.toBe("updated");
    expect(mutation.data.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("keeps only the latest mutation result when triggered multiple times", async () => {
    const resolvers = new Map<number, (value: number) => void>();

    const mutation = runComposable(() =>
      useSWRVMutation<number, Error, number>(
        "mutation-race",
        async (_key, { arg }) =>
          await new Promise<number>((resolve) => {
            resolvers.set(arg, resolve);
          }),
      ),
    );

    const first = mutation.trigger(0);
    const second = mutation.trigger(1);
    const third = mutation.trigger(2);
    await flush();

    resolvers.get(0)?.(0);
    await settle();
    expect(mutation.data.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(true);

    resolvers.get(1)?.(1);
    await settle();
    expect(mutation.data.value).toBeUndefined();
    expect(mutation.isMutating.value).toBe(true);

    resolvers.get(2)?.(2);
    await settle();

    await expect(first).resolves.toBe(0);
    await expect(second).resolves.toBe(1);
    await expect(third).resolves.toBe(2);
    expect(mutation.data.value).toBe(2);
    expect(mutation.isMutating.value).toBe(false);
  });

  it("clears mutation error state after a later successful trigger", async () => {
    const key = `mutation-error-clear-${Date.now()}`;
    let shouldSucceed = false;
    const mutation = runComposable(() =>
      useSWRVMutation<string[], Error, void>(key, async () => {
        if (shouldSucceed) {
          return ["foo"];
        }

        throw new Error("error");
      }),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("error");
    await settle();
    expect(mutation.error.value?.message).toBe("error");

    shouldSucceed = true;
    await expect(mutation.trigger(undefined)).resolves.toEqual(["foo"]);
    await settle();

    expect(mutation.error.value).toBeUndefined();
  });

  it("throws when triggering a mutation without a fetcher", async () => {
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>("missing-fetcher", null),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("missing fetcher");
  });

  it("throws when triggering a mutation without a key", async () => {
    const mutation = runComposable(() =>
      useSWRVMutation<string, Error, void>(null, async () => "data"),
    );

    await expect(mutation.trigger(undefined)).rejects.toThrow("missing key");
  });

  it("calls mutation onError and the returned rejection handler for falsey errors", async () => {
    const key = `mutation-falsey-error-${Date.now()}`;
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onRejected = vi.fn();
    const mutation = runComposable(() =>
      useSWRVMutation<never, string, void>(
        key,
        async () =>
          await new Promise<never>((_resolve, reject) => {
            reject("");
          }),
        {
          onError,
          onSuccess,
        },
      ),
    );

    await expect(mutation.trigger(undefined)).rejects.toBe("");
    await mutation.trigger(undefined).catch(onRejected);
    await settle();

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalled();
  });
});
