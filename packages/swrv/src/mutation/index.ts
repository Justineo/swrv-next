import { ref } from "vue";

import { useSWRVConfig } from "../_internal/utils/config-context";
import { resolveKeyValue, serialize } from "../_internal/utils/serialize";
import { getTimestamp } from "../_internal/utils/timestamp";
import { type HookWithArgs, withMiddleware } from "../_internal/utils/with-middleware";
import useSWRV from "../index/use-swr";

import type { KeySource, RawKey } from "../_internal/types";
import type {
  InternalSWRVMutationHook,
  MutationFetcher,
  MutationKey,
  SWRVMutationConfiguration,
  SWRVMutationResponse,
} from "./types";

export const mutation = function mutation(_useSWRVNext: HookWithArgs): InternalSWRVMutationHook {
  return function useSWRVMutation<
    Data = unknown,
    Error = unknown,
    Key extends RawKey = RawKey,
    ExtraArg = unknown,
    SWRData = Data,
  >(
    key: KeySource<Key>,
    fetcher: MutationFetcher<Data, Key, ExtraArg> | null,
    config: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData> = {},
  ): SWRVMutationResponse<Data, Error, Key, ExtraArg, SWRData> {
    const { mutate } = useSWRVConfig();

    const data = ref<Data>();
    const error = ref<Error>();
    const isMutating = ref(false);
    let ditchMutationsUntil = 0;

    const trigger = (async (
      arg?: ExtraArg,
      options: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData> = {},
    ) => {
      const resolvedKey = resolveKeyValue(key as KeySource<Key>);
      const [serializedKey] = serialize(resolvedKey);
      if (!fetcher) {
        throw new Error("Can’t trigger the mutation: missing fetcher.");
      }
      if (!serializedKey) {
        throw new Error("Can’t trigger the mutation: missing key.");
      }

      const mutationStartedAt = getTimestamp();
      ditchMutationsUntil = mutationStartedAt;
      isMutating.value = true;

      const mergedOptions = {
        populateCache: false,
        throwOnError: true,
        ...config,
        ...options,
      };

      try {
        const result = (await mutate<SWRData, Data>(
          resolvedKey,
          fetcher(resolvedKey as MutationKey<Key>, { arg: arg as ExtraArg }),
          {
            ...mergedOptions,
            throwOnError: true,
          },
        )) as Data | undefined;

        if (ditchMutationsUntil <= mutationStartedAt) {
          data.value = result;
          error.value = undefined;
          isMutating.value = false;
          mergedOptions.onSuccess?.(result as Data, serializedKey, mergedOptions);
        }

        return result;
      } catch (caught) {
        const resolvedError = caught as Error;
        if (ditchMutationsUntil <= mutationStartedAt) {
          error.value = resolvedError;
          isMutating.value = false;
          mergedOptions.onError?.(resolvedError, serializedKey, mergedOptions);
          if (mergedOptions.throwOnError !== false) {
            throw resolvedError;
          }
        }

        return undefined;
      }
    }) as SWRVMutationResponse<Data, Error, Key, ExtraArg, SWRData>["trigger"];

    return {
      data,
      error,
      isMutating,
      reset: () => {
        ditchMutationsUntil = getTimestamp();
        data.value = undefined;
        error.value = undefined;
        isMutating.value = false;
      },
      trigger,
    };
  };
};

const useSWRVMutationBase = withMiddleware(useSWRV as HookWithArgs, mutation);

export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = unknown,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, Key, ExtraArg> | null,
  config: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData> & {
    throwOnError: false;
  },
): SWRVMutationResponse<Data | undefined, Error, Key, ExtraArg, SWRData>;
export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = unknown,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, Key, ExtraArg> | null,
  config: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData> & {
    throwOnError: true;
  },
): SWRVMutationResponse<Data, Error, Key, ExtraArg, SWRData>;
export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = unknown,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, Key, ExtraArg> | null,
  config?: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData> & {
    throwOnError?: boolean;
  },
): SWRVMutationResponse<Data, Error, Key, ExtraArg, SWRData>;
export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = unknown,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, Key, ExtraArg> | null,
  config: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData> = {},
): SWRVMutationResponse<Data, Error, Key, ExtraArg, SWRData> {
  return useSWRVMutationBase(key, fetcher, config);
}

export type SWRVMutationHook = typeof useSWRVMutation;

export type {
  MutationFetcher,
  SWRMutationConfiguration,
  SWRMutationHook,
  SWRMutationResponse,
  SWRVMutationConfiguration,
  SWRVMutationResponse,
  TriggerWithArgs,
  TriggerWithOptionsArgs,
  TriggerWithoutArgs,
} from "./types";
