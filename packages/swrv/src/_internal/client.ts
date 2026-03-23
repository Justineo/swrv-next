import { createCache } from "./utils/cache";
import { createCacheHelper } from "./utils/helper";
import {
  addProviderSubscription,
  attachProviderEvents,
  broadcastAllProviderRevalidators,
  broadcastProviderRevalidators,
  consumeStoredPreload,
  createProviderState,
  getFetchRecord,
  getMutationMarker,
  invalidateFetchRecord,
  isLatestFetchRecord,
  notifyProviderListeners,
  setMutationMarker,
  startFetchRecord,
  storePreload,
} from "./provider-state";

import type {
  AnyCacheState,
  CacheAdapter,
  CacheListener,
  CacheState,
  FetchRecord,
  RawKey,
  RevalidateEvent,
  RevalidateEventOptions,
  Revalidator,
  SWRVClient,
  SWRVClientOptions,
} from "./types";

export function createSWRVClient(
  cache: CacheAdapter<AnyCacheState> = createCache<AnyCacheState>(),
  options: SWRVClientOptions = {},
): SWRVClient {
  const state = createProviderState();
  const cacheHelper = createCacheHelper(cache, (key, current, previous) => {
    notifyProviderListeners(state, key, current, previous);
  });
  const releaseEvents = attachProviderEvents(state, options);

  return {
    cache,
    state,
    addRevalidator(key: string, callback: Revalidator): () => void {
      return addProviderSubscription(state.revalidators, key, callback);
    },
    broadcast(
      key: string,
      event: RevalidateEvent,
      options?: RevalidateEventOptions,
    ): Promise<unknown[]> {
      return broadcastProviderRevalidators(state, key, event, options);
    },
    async broadcastAll(event: RevalidateEvent): Promise<void> {
      await broadcastAllProviderRevalidators(state, event);
    },
    consumePreload<Data = unknown>(key: string): Promise<Data> | undefined {
      return consumeStoredPreload<Data>(state, key);
    },
    dispose(): void {
      releaseEvents();
    },
    getFetch(key: string): FetchRecord | undefined {
      return getFetchRecord(state, key);
    },
    getMutation(key: string): [number, number] | undefined {
      return getMutationMarker(state, key);
    },
    getState<Data = unknown, Error = unknown>(key: string): CacheState<Data, Error> | undefined {
      return cacheHelper.get<Data, Error>(key);
    },
    invalidateFetch(key: string): void {
      invalidateFetchRecord(state, key);
    },
    isLatestFetch(key: string, startedAt: number): boolean {
      return isLatestFetchRecord(state, key, startedAt);
    },
    preload<Data = unknown>(
      key: string,
      value: Promise<Data> | (() => Promise<Data>),
    ): Promise<Data> {
      return storePreload<Data>(state, key, value);
    },
    setMutation(key: string, value: [number, number]): void {
      setMutationMarker(state, key, value);
    },
    setState<Data = unknown, Error = unknown>(
      key: string,
      patch: Partial<CacheState<Data, Error>>,
      rawKey?: RawKey,
    ): CacheState<Data, Error> {
      return cacheHelper.set<Data, Error>(key, patch, rawKey);
    },
    startFetch(
      key: string,
      value: Promise<unknown>,
      startedAt: number,
      dedupingInterval: number,
    ): void {
      startFetchRecord(state, key, value, startedAt, dedupingInterval);
    },
    subscribe(key: string, callback: CacheListener): () => void {
      return addProviderSubscription(state.listeners, key, callback);
    },
  };
}
