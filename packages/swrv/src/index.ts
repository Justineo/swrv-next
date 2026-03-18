import useSWRV, { unstable_serialize } from "./use-swrv";

import { GLOBAL_SWRV_CLIENT, SWRVConfig, createCacheProvider, useSWRVConfig } from "./config";
import { createScopedMutator, serialize } from "./_internal";

import type { RawKey } from "./_internal";

export { SWRVConfig, createCacheProvider, useSWRVConfig };
export { createCache, createScopedMutator, createSWRVClient } from "./_internal";
export { default as useSWRVImmutable } from "./immutable";
export { default as useSWRVInfinite } from "./infinite";
export { default as useSWRVMutation } from "./mutation";
export { default as useSWRVSubscription } from "./subscription";

export const mutate = createScopedMutator(GLOBAL_SWRV_CLIENT);
export const preload = <Data = unknown>(key: RawKey, fetcher: () => Promise<Data>) => {
  const [serializedKey] = serialize(key);
  if (!serializedKey) {
    return fetcher();
  }

  return GLOBAL_SWRV_CLIENT.preload(serializedKey, fetcher());
};

export default useSWRV;

export { unstable_serialize, useSWRV };

export type {
  BareFetcher,
  BoundMutator,
  CacheAdapter,
  CacheState,
  Compare,
  Fetcher,
  KeySource,
  MutatorCallback,
  MutatorOptions,
  RawKey,
  RevalidateOptions,
  ScopedMutator,
  SWRVClient,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVHook,
  SWRVMiddleware,
  SWRVResponse,
} from "./_internal";
export type { MutationFetcher, SWRVMutationConfiguration, SWRVMutationResponse } from "./mutation";
export type {
  SWRVInfiniteConfiguration,
  SWRVInfiniteKeyedMutator,
  SWRVInfiniteKeyLoader,
  SWRVInfiniteMutatorOptions,
  SWRVInfiniteRevalidateFn,
  SWRVInfiniteResponse,
} from "./infinite";
export type {
  SWRVSubscription,
  SWRVSubscriptionOptions,
  SWRVSubscriptionResponse,
} from "./subscription";
