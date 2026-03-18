import { createCache } from "./cache";

import type {
  CacheAdapter,
  CacheListener,
  CacheState,
  FetchRecord,
  RawKey,
  RevalidateEvent,
  RevalidateEventOptions,
  Revalidator,
  SWRVClient,
} from "./types";

const NOOP = () => {};

function cloneState<Data, Error>(
  state?: CacheState<Data, Error>,
): CacheState<Data, Error> | undefined {
  return state ? { ...state } : undefined;
}

export function createSWRVClient(
  cache: CacheAdapter<CacheState<any, any>> = createCache<CacheState<any, any>>(),
): SWRVClient {
  const state = {
    fetches: new Map<string, FetchRecord>(),
    listeners: new Map<string, Set<CacheListener>>(),
    latestFetchTimestamp: new Map<string, number>(),
    mutations: new Map<string, [number, number]>(),
    preloads: new Map<string, Promise<unknown>>(),
    revalidators: new Map<string, Set<Revalidator>>(),
  };

  const notifyListeners = (
    key: string,
    current: CacheState<any, any> | undefined,
    previous: CacheState<any, any> | undefined,
  ) => {
    const listeners = state.listeners.get(key);

    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(current, previous);
    }
  };

  const getState = <Data = unknown, Error = unknown>(
    key: string,
  ): CacheState<Data, Error> | undefined => {
    const cached = cache.get(key);

    if (!cached) {
      return undefined;
    }

    if (cached.expiresAt !== Number.POSITIVE_INFINITY && cached.expiresAt <= Date.now()) {
      cache.delete(key);
      notifyListeners(key, undefined, cached);
      return undefined;
    }

    return cached as CacheState<Data, Error>;
  };

  const setState = <Data = unknown, Error = unknown>(
    key: string,
    patch: Partial<CacheState<Data, Error>>,
    ttl = 0,
    rawKey?: RawKey,
  ): CacheState<Data, Error> => {
    const previous = cloneState(getState<Data, Error>(key));
    const now = Date.now();
    const next = {
      data: previous?.data,
      error: previous?.error,
      isLoading: previous?.isLoading ?? false,
      isValidating: previous?.isValidating ?? false,
      expiresAt: ttl > 0 ? now + ttl : (previous?.expiresAt ?? Number.POSITIVE_INFINITY),
      _c: previous?._c,
      _k: rawKey ?? previous?._k,
      ...patch,
      updatedAt: now,
    } satisfies CacheState<Data, Error>;

    cache.set(key, next);
    notifyListeners(key, next, previous);
    return next;
  };

  const subscribe = (key: string, callback: CacheListener) => {
    const listeners = state.listeners.get(key) ?? new Set<CacheListener>();
    listeners.add(callback);
    state.listeners.set(key, listeners);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        state.listeners.delete(key);
      }
    };
  };

  const addRevalidator = (key: string, callback: Revalidator) => {
    const listeners = state.revalidators.get(key) ?? new Set<Revalidator>();
    listeners.add(callback);
    state.revalidators.set(key, listeners);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        state.revalidators.delete(key);
      }
    };
  };

  const broadcast = async (
    key: string,
    event: RevalidateEvent,
    options?: RevalidateEventOptions,
  ) => {
    const revalidators = state.revalidators.get(key);

    if (!revalidators || revalidators.size === 0) {
      return [];
    }

    return Promise.all(Array.from(revalidators).map((revalidator) => revalidator(event, options)));
  };

  const broadcastAll = async (event: RevalidateEvent) => {
    await Promise.all(
      Array.from(state.revalidators.keys()).map(async (key) => {
        await broadcast(key, event);
      }),
    );
  };

  const getFetch = (key: string, now: number, dedupingInterval: number) => {
    const current = state.fetches.get(key);
    if (!current) {
      return undefined;
    }

    return now - current.startedAt <= dedupingInterval ? current : undefined;
  };

  const startFetch = (
    key: string,
    promise: Promise<unknown>,
    startedAt: number,
    dedupingInterval: number,
  ) => {
    state.fetches.set(key, { promise, startedAt });
    state.latestFetchTimestamp.set(key, startedAt);

    setTimeout(() => {
      const current = state.fetches.get(key);
      if (current?.startedAt === startedAt) {
        state.fetches.delete(key);
      }
    }, dedupingInterval);
  };

  const preload = <Data = unknown>(key: string, value: Promise<Data>) => {
    state.preloads.set(key, value);
    return value;
  };

  const consumePreload = <Data = unknown>(key: string) => {
    const current = state.preloads.get(key) as Promise<Data> | undefined;
    if (current) {
      state.preloads.delete(key);
    }

    return current;
  };

  const getMutation = (key: string) => state.mutations.get(key);
  const setMutation = (key: string, value: [number, number]) => {
    state.mutations.set(key, value);
  };

  const isLatestFetch = (key: string, startedAt: number) =>
    state.latestFetchTimestamp.get(key) === startedAt;

  let dispose = NOOP;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const onFocus = () => {
      void broadcastAll("focus");
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void broadcastAll("focus");
      }
    };
    const onReconnect = () => {
      void broadcastAll("reconnect");
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onReconnect);
    document.addEventListener("visibilitychange", onVisibilityChange);

    dispose = () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onReconnect);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }

  return {
    cache,
    state,
    addRevalidator,
    broadcast,
    broadcastAll,
    consumePreload,
    dispose,
    getFetch,
    getMutation,
    getState,
    isLatestFetch,
    preload,
    setMutation,
    setState,
    startFetch,
    subscribe,
  };
}
