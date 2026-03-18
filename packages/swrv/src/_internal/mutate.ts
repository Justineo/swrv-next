import { serialize } from "./serialize";

import type {
  CacheState,
  KeyFilter,
  MutatorCallback,
  MutatorOptions,
  RawKey,
  ScopedMutator,
  SWRVClient,
} from "./types";

function isFunction(value: unknown): value is (...args: readonly unknown[]) => unknown {
  return typeof value === "function";
}

function isPromiseLike<Data>(value: unknown): value is Promise<Data> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Promise<Data>).then === "function"
  );
}

function shouldRollback(rollbackOnError: MutatorOptions["rollbackOnError"], error: unknown) {
  return typeof rollbackOnError === "function" ? rollbackOnError(error) : rollbackOnError !== false;
}

function shouldRevalidate<Data>(
  option: MutatorOptions<Data>["revalidate"],
  data: Data | undefined,
  key: RawKey,
) {
  return typeof option === "function" ? option(data, key) : option !== false;
}

export function createScopedMutator(client: SWRVClient): ScopedMutator {
  return async function scopedMutate<Data = unknown>(
    keyOrFilter: RawKey | KeyFilter,
    data?: Data | Promise<Data | undefined> | MutatorCallback<Data>,
    options?: boolean | MutatorOptions<Data>,
  ) {
    if (isFunction(keyOrFilter)) {
      const results: Array<Data | undefined> = [];

      for (const key of client.cache.keys()) {
        const cached = client.getState(key);
        if (cached?._k && (keyOrFilter as KeyFilter)(cached._k)) {
          results.push((await scopedMutate(cached._k, data, options)) as Data | undefined);
        }
      }

      return results;
    }

    const normalizedOptions =
      typeof options === "boolean"
        ? { revalidate: options, populateCache: true, throwOnError: true }
        : {
            populateCache: true,
            throwOnError: true,
            ...options,
          };

    const [serializedKey, rawKey] = serialize(keyOrFilter as RawKey);
    if (!serializedKey) {
      return undefined;
    }

    if (arguments.length < 2) {
      await client.broadcast(serializedKey, "mutate", {
        revalidate: normalizedOptions.revalidate as
          | boolean
          | ((data: unknown, key: RawKey) => boolean)
          | undefined,
      });
      return client.getState<Data>(serializedKey)?.data;
    }

    const currentState =
      client.getState<Data>(serializedKey) ??
      ({
        isLoading: false,
        isValidating: false,
        updatedAt: Date.now(),
        expiresAt: Number.POSITIVE_INFINITY,
      } satisfies CacheState<Data, unknown>);

    const committedData = currentState._c === undefined ? currentState.data : currentState._c;

    const mutationStartedAt = Date.now();
    client.setMutation(serializedKey, [mutationStartedAt, 0]);

    if (normalizedOptions.optimisticData !== undefined) {
      const optimisticData = isFunction(normalizedOptions.optimisticData)
        ? normalizedOptions.optimisticData(committedData, currentState.data)
        : normalizedOptions.optimisticData;

      client.setState<Data>(
        serializedKey,
        {
          data: optimisticData as Data,
          error: undefined,
          isLoading: false,
          isValidating: false,
          _c: committedData,
        },
        currentState.expiresAt === Number.POSITIVE_INFINITY
          ? 0
          : currentState.expiresAt - Date.now(),
        rawKey,
      );
    }

    let result = data as Data | Promise<Data | undefined> | undefined;
    let error: unknown;
    let failed = false;

    if (isFunction(result)) {
      try {
        result = (result as MutatorCallback<Data>)(committedData);
      } catch (caught) {
        error = caught;
        failed = true;
      }
    }

    if (isPromiseLike<Data | undefined>(result)) {
      try {
        result = await result;
      } catch (caught) {
        error = caught;
        failed = true;
      }

      if (client.getMutation(serializedKey)?.[0] !== mutationStartedAt) {
        if (failed && normalizedOptions.throwOnError) {
          throw error;
        }
        return result as Data | undefined;
      }

      if (
        failed &&
        normalizedOptions.optimisticData !== undefined &&
        shouldRollback(normalizedOptions.rollbackOnError, error)
      ) {
        client.setState<Data>(
          serializedKey,
          {
            data: committedData,
            _c: undefined,
            error: currentState.error,
            isLoading: false,
            isValidating: false,
          },
          0,
          rawKey,
        );
      }
    }

    if (!failed && normalizedOptions.populateCache !== false) {
      const nextData =
        typeof normalizedOptions.populateCache === "function"
          ? normalizedOptions.populateCache(result as Data, committedData)
          : (result as Data | undefined);

      client.setState<Data>(
        serializedKey,
        {
          data: nextData,
          error: undefined,
          isLoading: false,
          isValidating: false,
          _c: undefined,
        },
        0,
        rawKey,
      );
    }

    client.setMutation(serializedKey, [mutationStartedAt, Date.now()]);

    const revalidate = shouldRevalidate(
      normalizedOptions.revalidate,
      client.getState<Data>(serializedKey)?.data,
      rawKey,
    );

    await client.broadcast(serializedKey, "mutate", {
      revalidate,
      throwOnError: normalizedOptions.throwOnError,
    });

    client.setState<Data>(serializedKey, { _c: undefined }, 0, rawKey);

    if (failed) {
      if (normalizedOptions.throwOnError) {
        throw error;
      }

      return undefined;
    }

    return client.getState<Data>(serializedKey)?.data;
  };
}
