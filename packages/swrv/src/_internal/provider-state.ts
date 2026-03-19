import { defaultInitFocus, defaultInitReconnect } from "./web-preset";

import type {
  CacheListener,
  FetchRecord,
  RevalidateEvent,
  RevalidateEventOptions,
  Revalidator,
  SWRVClientOptions,
  SWRVClientState,
  SWRVEventInitializer,
} from "./types";

const NOOP = () => {};

function toDisposer(value: void | (() => void)): () => void {
  return typeof value === "function" ? value : NOOP;
}

function getCallbackSet<Callback>(store: Map<string, Set<Callback>>, key: string): Set<Callback> {
  const current = store.get(key);
  if (current) {
    return current;
  }

  const next = new Set<Callback>();
  store.set(key, next);
  return next;
}

export function createProviderState(): SWRVClientState {
  return {
    fetches: new Map<string, FetchRecord>(),
    listeners: new Map<string, Set<CacheListener>>(),
    latestFetchTimestamp: new Map<string, number>(),
    mutations: new Map<string, [number, number]>(),
    preloads: new Map<string, Promise<unknown>>(),
    revalidators: new Map<string, Set<Revalidator>>(),
  };
}

export function addProviderSubscription<Callback>(
  store: Map<string, Set<Callback>>,
  key: string,
  callback: Callback,
): () => void {
  const callbacks = getCallbackSet(store, key);
  callbacks.add(callback);

  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      store.delete(key);
    }
  };
}

export function notifyProviderListeners(
  state: SWRVClientState,
  key: string,
  current: Parameters<CacheListener>[0],
  previous: Parameters<CacheListener>[1],
): void {
  const listeners = state.listeners.get(key);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(current, previous);
  }
}

export function broadcastProviderRevalidators(
  state: SWRVClientState,
  key: string,
  event: RevalidateEvent,
  options?: RevalidateEventOptions,
): Promise<unknown[]> {
  const revalidators = state.revalidators.get(key);
  if (!revalidators || revalidators.size === 0) {
    return Promise.resolve([]);
  }

  return Promise.all(Array.from(revalidators).map((revalidator) => revalidator(event, options)));
}

export async function broadcastAllProviderRevalidators(
  state: SWRVClientState,
  event: RevalidateEvent,
): Promise<void> {
  await Promise.all(
    Array.from(state.revalidators.keys()).map(async (key) => {
      await broadcastProviderRevalidators(state, key, event);
    }),
  );
}

export function getFetchRecord(
  state: SWRVClientState,
  key: string,
  now: number,
  dedupingInterval: number,
): FetchRecord | undefined {
  const current = state.fetches.get(key);
  if (!current) {
    return undefined;
  }

  return now - current.startedAt <= dedupingInterval ? current : undefined;
}

export function invalidateFetchRecord(state: SWRVClientState, key: string): void {
  state.fetches.delete(key);
  state.latestFetchTimestamp.delete(key);
}

export function startFetchRecord(
  state: SWRVClientState,
  key: string,
  promise: Promise<unknown>,
  startedAt: number,
  dedupingInterval: number,
): void {
  state.fetches.set(key, { promise, startedAt });
  state.latestFetchTimestamp.set(key, startedAt);

  setTimeout(() => {
    const current = state.fetches.get(key);
    if (current?.startedAt === startedAt) {
      state.fetches.delete(key);
    }
  }, dedupingInterval);
}

export function storePreload<Data = unknown>(
  state: SWRVClientState,
  key: string,
  value: Promise<Data> | (() => Promise<Data>),
): Promise<Data> {
  const current = state.preloads.get(key) as Promise<Data> | undefined;
  if (current) {
    return current;
  }

  const tracked = Promise.resolve(typeof value === "function" ? value() : value).catch((error) => {
    if (state.preloads.get(key) === tracked) {
      state.preloads.delete(key);
    }

    throw error;
  });

  state.preloads.set(key, tracked);
  return tracked;
}

export function consumeStoredPreload<Data = unknown>(
  state: SWRVClientState,
  key: string,
): Promise<Data> | undefined {
  const current = state.preloads.get(key) as Promise<Data> | undefined;
  if (current) {
    state.preloads.delete(key);
  }

  return current;
}

export function getMutationMarker(
  state: SWRVClientState,
  key: string,
): [number, number] | undefined {
  return state.mutations.get(key);
}

export function setMutationMarker(
  state: SWRVClientState,
  key: string,
  value: [number, number],
): void {
  state.mutations.set(key, value);
}

export function isLatestFetchRecord(
  state: SWRVClientState,
  key: string,
  startedAt: number,
): boolean {
  return state.latestFetchTimestamp.get(key) === startedAt;
}

export function attachProviderEvents(
  state: SWRVClientState,
  options: SWRVClientOptions = {},
): () => void {
  const initFocus: SWRVEventInitializer = options.initFocus ?? defaultInitFocus;
  const initReconnect: SWRVEventInitializer = options.initReconnect ?? defaultInitReconnect;

  const disposeFocus = toDisposer(
    initFocus(() => {
      void broadcastAllProviderRevalidators(state, "focus");
    }),
  );
  const disposeReconnect = toDisposer(
    initReconnect(() => {
      void broadcastAllProviderRevalidators(state, "reconnect");
    }),
  );

  return () => {
    disposeFocus();
    disposeReconnect();
  };
}
