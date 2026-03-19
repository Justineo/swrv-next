import useSWRV, { unstable_serialize } from "./index/index";

import { GLOBAL_SWRV_CLIENT, SWRVConfig, createCacheProvider, useSWRVConfig } from "./config";
import {
  getScopedMutator,
  getScopedPreload,
  hydrateSWRVSnapshot,
  serializeSWRVSnapshot,
} from "./_internal";

import type { PreloadFunction } from "./_internal/types";

export { SWRVConfig, createCacheProvider, useSWRVConfig };
export { createCache, createScopedMutator, createSWRVClient } from "./_internal";
export { default as useSWRVImmutable } from "./immutable";
export { default as useSWRVInfinite } from "./infinite";
export { default as useSWRVMutation } from "./mutation";
export { default as useSWRVSubscription } from "./subscription";

export const mutate = getScopedMutator(GLOBAL_SWRV_CLIENT);
export const preload: PreloadFunction = getScopedPreload(GLOBAL_SWRV_CLIENT);
export { hydrateSWRVSnapshot, serializeSWRVSnapshot };

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
  PreloadFunction,
  RawKey,
  RevalidateOptions,
  ScopedMutator,
  SWRVClient,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVFallbackSnapshot,
  SWRVHook,
  SWRVMiddleware,
  SWRVResponse,
} from "./_internal";
export type {
  MutationFetcher,
  SWRVMutationConfiguration,
  SWRVMutationHook,
  SWRVMutationResponse,
  TriggerWithArgs,
  TriggerWithOptionsArgs,
  TriggerWithoutArgs,
} from "./mutation";
export type {
  SWRVInfiniteCompareFn,
  SWRVInfiniteConfiguration,
  SWRVInfiniteHook,
  SWRVInfiniteKeyedMutator,
  SWRVInfiniteKeyLoader,
  SWRVInfiniteMutatorOptions,
  SWRVInfiniteRevalidateFn,
  SWRVInfiniteResponse,
} from "./infinite";
export type {
  SWRVSubscription,
  SWRVSubscriptionHook,
  SWRVSubscriptionOptions,
  SWRVSubscriptionResponse,
} from "./subscription";
