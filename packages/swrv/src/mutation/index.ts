import { ref } from "vue";

import { useSWRVConfig } from "../config";
import { resolveKeyValue, serialize } from "../_internal/serialize";
import { type HookWithArgs, withMiddleware } from "../_internal/with-middleware";
import useSWRV from "../index/use-swrv";

import type { KeySource, RawKey, SWRVMiddleware } from "../_internal/types";
import type {
  MutationFetcher,
  SWRVMutationConfiguration,
  SWRVMutationHook,
  SWRVMutationResponse,
} from "./types";

export const mutation = function mutation(_useSWRVNext: HookWithArgs): SWRVMutationHook {
  return function useSWRVMutation<
    Data = unknown,
    Error = unknown,
    ExtraArg = unknown,
    Key extends RawKey = RawKey,
    SWRData = Data,
  >(
    key: KeySource<Key>,
    fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
    config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData> = {},
  ): SWRVMutationResponse<Data, Error, ExtraArg, Key, SWRData> {
    const { mutate } = useSWRVConfig();

    const data = ref<Data>();
    const error = ref<Error>();
    const isMutating = ref(false);
    let ignoreResultsBefore = 0;
    let mutationVersion = 0;

    const trigger = (async (
      arg?: ExtraArg,
      options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData> = {},
    ) => {
      const resolvedKey = resolveKeyValue(key as KeySource<Key>);
      const [serializedKey] = serialize(resolvedKey);
      if (!fetcher) {
        throw new Error("Can’t trigger the mutation: missing fetcher.");
      }
      if (!serializedKey) {
        throw new Error("Can’t trigger the mutation: missing key.");
      }

      const mutationStartedAt = ++mutationVersion;
      ignoreResultsBefore = mutationStartedAt;
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
          fetcher(resolvedKey, { arg: arg as ExtraArg }),
          {
            ...mergedOptions,
            throwOnError: true,
          },
        )) as Data | undefined;

        if (ignoreResultsBefore <= mutationStartedAt) {
          data.value = result;
          error.value = undefined;
          isMutating.value = false;
          mergedOptions.onSuccess?.(result as Data, resolvedKey, mergedOptions);
        }

        return result;
      } catch (caught) {
        const resolvedError = caught as Error;
        if (ignoreResultsBefore <= mutationStartedAt) {
          error.value = resolvedError;
          isMutating.value = false;
          mergedOptions.onError?.(resolvedError, resolvedKey, mergedOptions);
          if (mergedOptions.throwOnError !== false) {
            throw resolvedError;
          }
        }

        return undefined;
      }
    }) as SWRVMutationResponse<Data, Error, ExtraArg, Key, SWRData>["trigger"];

    return {
      data,
      error,
      isMutating,
      reset: () => {
        ignoreResultsBefore = ++mutationVersion;
        data.value = undefined;
        error.value = undefined;
        isMutating.value = false;
      },
      trigger,
    };
  };
};

const useSWRVMutationBase = withMiddleware(
  useSWRV as HookWithArgs,
  mutation as unknown as SWRVMiddleware,
) as unknown as SWRVMutationHook;

export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
  config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData> & {
    throwOnError: false;
  },
): SWRVMutationResponse<Data | undefined, Error, ExtraArg, Key, SWRData>;
export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
  config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData> & {
    throwOnError: true;
  },
): SWRVMutationResponse<Data, Error, ExtraArg, Key, SWRData>;
export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
  config?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData> & {
    throwOnError?: boolean;
  },
): SWRVMutationResponse<Data, Error, ExtraArg, Key, SWRData>;
export default function useSWRVMutation<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
  config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData> = {},
): SWRVMutationResponse<Data, Error, ExtraArg, Key, SWRData> {
  return useSWRVMutationBase(key, fetcher, config);
}

export type {
  MutationFetcher,
  SWRVMutationConfiguration,
  SWRVMutationHook,
  SWRVMutationResponse,
  TriggerWithArgs,
  TriggerWithOptionsArgs,
  TriggerWithoutArgs,
} from "./types";
