import { ref } from "vue";

import { useSWRVConfig } from "../config";
import { useSWRVContext } from "../config";
import { applyFeatureMiddleware } from "../_internal";
import { resolveMiddlewareStack } from "../_internal/middleware-stack";
import { resolveKeyValue, serialize } from "../_internal/serialize";
import { useSWRVHandler } from "../use-swrv-handler";

import type {
  KeySource,
  MutatorOptions,
  RawKey,
  SWRVConfiguration,
  SWRVHook,
  SWRVResponse,
} from "../_internal/types";

type RemoveUndefined<T> = T extends undefined ? never : T;
type IsUndefinedIncluded<T> = undefined extends T ? true : false;

export interface SWRVMutationConfiguration<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>
  extends
    Omit<SWRVConfiguration<Data, Error>, "fetcher" | "onError" | "onSuccess">,
    MutatorOptions<SWRData, Data> {
  onError?: (
    error: Error,
    key: Key,
    config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData>,
  ) => void;
  onSuccess?: (
    data: Data,
    key: Key,
    config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData>,
  ) => void;
}

export type MutationFetcher<Data = unknown, ExtraArg = unknown, Key extends RawKey = RawKey> = (
  key: Key,
  options: { arg: ExtraArg },
) => Data | Promise<Data>;

export interface TriggerWithArgs<
  Data = unknown,
  Error = unknown,
  ExtraArg = never,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data | undefined>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData>,
  ): Promise<Data>;
}

export interface TriggerWithOptionsArgs<
  Data = unknown,
  Error = unknown,
  ExtraArg = never,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data | undefined>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg?: ExtraArg,
    options?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData>,
  ): Promise<Data>;
}

export interface TriggerWithoutArgs<
  Data = unknown,
  Error = unknown,
  ExtraArg = never,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: null | undefined,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data>;
  <CurrentData = SWRData>(
    arg: null | undefined,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg?: null,
    options?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData>,
  ): Promise<Data>;
}

export interface SWRVMutationResponse<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  data: SWRVResponse<Data, Error>["data"];
  error: SWRVResponse<Data, Error>["error"];
  isMutating: SWRVResponse<boolean, never>["data"];
  reset: () => void;
  trigger: [ExtraArg] extends [never]
    ? TriggerWithoutArgs<Data, Error, ExtraArg, Key, SWRData>
    : IsUndefinedIncluded<ExtraArg> extends true
      ? TriggerWithOptionsArgs<Data, Error, ExtraArg, Key, SWRData>
      : TriggerWithArgs<Data, Error, ExtraArg, Key, SWRData>;
}

type SWRVMutationHook = <
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
  config?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData>,
) => SWRVMutationResponse<Data, Error, ExtraArg, Key, SWRData>;

function createMutationHook(_useSWRVNext: SWRVHook): SWRVMutationHook {
  return function useSWRVMutationHook<
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
}

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
  const context = useSWRVContext();
  const middlewares = resolveMiddlewareStack(context.config.value, config);
  const runMutation = applyFeatureMiddleware(createMutationHook(useSWRVHandler), middlewares);

  return runMutation(key, fetcher, config);
}
