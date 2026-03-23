import { setupDevTools } from "./utils/devtools";

export { createCache } from "./utils/cache";
export { INFINITE_PREFIX } from "./constants";
export { cache, client, compare, defaultConfig, mutate, preload } from "./utils/config";
export { createSWRVClient } from "./client";
export * as revalidateEvents from "./events";
export { hydrateSWRVSnapshot, serializeSWRVSnapshot } from "./ssr";
export * from "./utils/env";
export { stableHash } from "./utils/hash";
export { createCacheHelper, type SWRVCacheHelper } from "./utils/helper";
export { mergeConfigs } from "./utils/merge-config";
export { internalMutate } from "./utils/mutate";
export { normalize } from "./utils/normalize-args";
export { withArgs } from "./utils/resolve-args";
export { callFetcher, resolveKeyValue, serialize } from "./utils/serialize";
export { isFunction, isPromiseLike, noop } from "./utils/shared";
export { getTimestamp } from "./utils/timestamp";
export { useSWRConfig } from "./utils/use-swr-config";
export { preset, defaultConfigOptions } from "./utils/web-preset";
export { withMiddleware } from "./utils/with-middleware";
export { SWRVConfig, SWRVConfig as SWRConfig } from "./utils/config-context";

export type {
  Arguments,
  BareFetcher,
  BoundMutator,
  Cache,
  CacheAdapter,
  CacheState,
  Compare,
  Fetcher,
  Key,
  KeyFilter,
  KeySource,
  KeyedMutator,
  Middleware,
  MutatorCallback,
  MutatorOptions,
  PreloadFunction,
  RawKey,
  RevalidateEvent,
  RevalidateEventOptions,
  RevalidateOptions,
  SWRConfiguration,
  SWRResponse,
  ResolvedSWRVConfiguration,
  ScopedMutator,
  SWRVClient,
  SWRVConfigAccessor,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVFallbackSnapshot,
  InternalSWRVHook,
  State,
  SWRVMiddleware,
  SWRVResponse,
} from "./types";

setupDevTools();
