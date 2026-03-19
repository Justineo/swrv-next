import useSWRV, { unstable_serialize } from "./use-swrv";

import { GLOBAL_SWRV_CLIENT, SWRVConfig, createCacheProvider, useSWRVConfig } from "./config";
import {
  createScopedMutator,
  hydrateSWRVSnapshot,
  preloadKey,
  serializeSWRVSnapshot,
} from "./_internal";

import type {
  Fetcher,
  FetcherResponse,
  KeySource,
  PreloadResponse,
  RawKey,
} from "./_internal/types";

export { SWRVConfig, createCacheProvider, useSWRVConfig };
export { createCache, createScopedMutator, createSWRVClient } from "./_internal";
export { default as useSWRVImmutable } from "./immutable";
export { default as useSWRVInfinite } from "./infinite";
export { default as useSWRVMutation } from "./mutation";
export { default as useSWRVSubscription } from "./subscription";

export const mutate = createScopedMutator(GLOBAL_SWRV_CLIENT);
type NonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;

export function preload<Data = unknown, Key extends readonly unknown[] = readonly unknown[]>(
  key: KeySource<Key>,
  fetcher: (...args: Key) => FetcherResponse<Data>,
): PreloadResponse<Data>;
export function preload<Data = unknown, Key extends NonArrayKey = NonArrayKey>(
  key: KeySource<Key>,
  fetcher: (arg: Key) => FetcherResponse<Data>,
): PreloadResponse<Data>;
export function preload<Data = unknown, Key extends RawKey = RawKey>(
  key: KeySource<Key>,
  fetcher: Fetcher<Data, Key>,
) {
  return preloadKey(GLOBAL_SWRV_CLIENT, key, fetcher);
}
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
  SWRVMutationResponse,
  TriggerWithArgs,
  TriggerWithOptionsArgs,
  TriggerWithoutArgs,
} from "./mutation";
export type {
  SWRVInfiniteCompareFn,
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
