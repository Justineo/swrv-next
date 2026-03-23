import useSWRV, { unstable_serialize } from "./index/use-swr";

import { SWRConfig, SWRVConfig, useSWRConfig, useSWRVConfig } from "./config";
import { createCache } from "./_internal/cache";
import { createSWRVClient } from "./_internal/client";
import { mutate, preload } from "./_internal/config";
import { hydrateSWRVSnapshot, serializeSWRVSnapshot } from "./_internal/ssr";

export { SWRConfig, SWRVConfig, useSWRConfig, useSWRVConfig };
export { createCache, createSWRVClient };
export { default as useSWRVImmutable } from "./immutable";
export { default as useSWRVInfinite } from "./infinite";
export { default as useSWRVMutation } from "./mutation";
export { default as useSWRVSubscription } from "./subscription";
export { mutate, preload };
export { default as useSWR } from "./index/use-swr";
export { default as useSWRImmutable } from "./immutable";
export { default as useSWRInfinite } from "./infinite";
export { default as useSWRMutation } from "./mutation";
export { default as useSWRSubscription } from "./subscription";

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
  Middleware,
  MutatorCallback,
  MutatorOptions,
  PreloadFunction,
  RevalidateOptions,
  ScopedMutator,
  SWRConfiguration,
  SWRResponse,
  SWRVClient,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVFallbackSnapshot,
  State,
  SWRVMiddleware,
  SWRVResponse,
} from "./_internal";
export type { SWRHook, SWRVHook } from "./index/use-swr";
export type {
  MutationFetcher,
  SWRMutationConfiguration,
  SWRMutationHook,
  SWRMutationResponse,
  SWRVMutationConfiguration,
  SWRVMutationHook,
  SWRVMutationResponse,
  TriggerWithArgs,
  TriggerWithOptionsArgs,
  TriggerWithoutArgs,
} from "./mutation";
export type {
  SWRInfiniteCompareFn,
  SWRInfiniteConfiguration,
  SWRInfiniteHook,
  SWRInfiniteKeyedMutator,
  SWRInfiniteKeyLoader,
  SWRInfiniteMutatorOptions,
  SWRInfiniteRevalidateFn,
  SWRInfiniteResponse,
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
  SWRSubscription,
  SWRSubscriptionHook,
  SWRSubscriptionOptions,
  SWRSubscriptionResponse,
  SWRVSubscription,
  SWRVSubscriptionHook,
  SWRVSubscriptionOptions,
  SWRVSubscriptionResponse,
} from "./subscription";
