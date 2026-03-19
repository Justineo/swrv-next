import useSWRV, { unstable_serialize } from "./index/use-swrv";

import { GLOBAL_SWRV_CLIENT, SWRVConfig, useSWRVConfig } from "./config";
import { createCache } from "./_internal/cache";
import { createSWRVClient } from "./_internal/client";
import { getScopedMutator } from "./_internal/mutate";
import { getScopedPreload } from "./_internal/preload";
import { hydrateSWRVSnapshot, serializeSWRVSnapshot } from "./_internal/ssr";

import type { PreloadFunction } from "./_internal/types";

export { SWRVConfig, useSWRVConfig };
export { createCache, createSWRVClient };
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
  Arguments,
  BareFetcher,
  Cache,
  Compare,
  Fetcher,
  Key,
  KeyedMutator,
  MutatorCallback,
  MutatorOptions,
  PreloadFunction,
  RevalidateOptions,
  ScopedMutator,
  SWRVClient,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVFallbackSnapshot,
  State,
  SWRVMiddleware,
  SWRVResponse,
} from "./_internal";
export type { SWRVHook } from "./index/use-swrv";
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
