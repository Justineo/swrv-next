import { ref } from "vue";

import { useSWRVConfig } from "../config";
import { resolveKeyValue, serialize } from "../_internal/serialize";

import type { KeySource, RawKey, SWRVConfiguration, SWRVResponse } from "../_internal/types";

export interface SWRVMutationConfiguration<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
> extends Omit<SWRVConfiguration<Data, Error>, "fetcher" | "onError" | "onSuccess"> {
  onError?: (
    error: Error,
    key: Key,
    config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key>,
  ) => void;
  onSuccess?: (
    data: Data,
    key: Key,
    config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key>,
  ) => void;
  populateCache?: boolean | ((result: Data, currentData: Data | undefined) => Data);
  throwOnError?: boolean;
}

export type MutationFetcher<Data = unknown, ExtraArg = unknown, Key extends RawKey = RawKey> = (
  key: Key,
  options: { arg: ExtraArg },
) => Data | Promise<Data>;

export interface SWRVMutationResponse<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
> {
  data: SWRVResponse<Data, Error>["data"];
  error: SWRVResponse<Data, Error>["error"];
  isMutating: SWRVResponse<boolean, never>["data"];
  reset: () => void;
  trigger: (
    arg: ExtraArg,
    options?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key>,
  ) => Promise<Data | undefined>;
}

export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
  config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key> = {},
): SWRVMutationResponse<Data, Error, ExtraArg, Key> {
  const { mutate } = useSWRVConfig();

  const data = ref<Data>();
  const error = ref<Error>();
  const isMutating = ref(false);
  let ditchMutationsUntil = 0;
  let mutationTimestamp = 0;

  const trigger = async (
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key> = {},
  ) => {
    const resolvedKey = resolveKeyValue(key as KeySource<Key>);
    const [serializedKey] = serialize(resolvedKey);
    if (!fetcher) {
      throw new Error("Can’t trigger the mutation: missing fetcher.");
    }
    if (!serializedKey) {
      throw new Error("Can’t trigger the mutation: missing key.");
    }

    const mutationStartedAt = ++mutationTimestamp;
    ditchMutationsUntil = mutationStartedAt;
    isMutating.value = true;

    const mergedOptions = {
      populateCache: false,
      throwOnError: true,
      ...config,
      ...options,
    };

    try {
      const result = (await mutate<Data>(
        resolvedKey,
        fetcher(resolvedKey, { arg }),
        mergedOptions,
      )) as Data | undefined;

      if (ditchMutationsUntil <= mutationStartedAt) {
        data.value = result;
        error.value = undefined;
        isMutating.value = false;
        mergedOptions.onSuccess?.(result as Data, resolvedKey, mergedOptions);
      }

      return result;
    } catch (caught) {
      const resolvedError = caught as Error;
      if (ditchMutationsUntil <= mutationStartedAt) {
        error.value = resolvedError;
        isMutating.value = false;
        mergedOptions.onError?.(resolvedError, resolvedKey, mergedOptions);
        if (mergedOptions.throwOnError !== false) {
          throw resolvedError;
        }
      }

      return undefined;
    }
  };

  return {
    data,
    error,
    isMutating,
    reset: () => {
      ditchMutationsUntil = ++mutationTimestamp;
      data.value = undefined;
      error.value = undefined;
      isMutating.value = false;
    },
    trigger,
  };
}
