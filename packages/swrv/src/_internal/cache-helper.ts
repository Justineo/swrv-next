import type { CacheAdapter, CacheState, RawKey } from "./types";

function cloneState<Data, Error>(
  state?: CacheState<Data, Error>,
): CacheState<Data, Error> | undefined {
  return state ? { ...state } : undefined;
}

export interface SWRVCacheHelper {
  get<Data = unknown, Error = unknown>(key: string): CacheState<Data, Error> | undefined;
  set<Data = unknown, Error = unknown>(
    key: string,
    patch: Partial<CacheState<Data, Error>>,
    ttl?: number,
    rawKey?: RawKey,
  ): CacheState<Data, Error>;
}

export function createCacheHelper(
  cache: CacheAdapter<CacheState<any, any>>,
  notify: (
    key: string,
    current: CacheState<any, any> | undefined,
    previous: CacheState<any, any> | undefined,
  ) => void,
): SWRVCacheHelper {
  return {
    get<Data = unknown, Error = unknown>(key: string): CacheState<Data, Error> | undefined {
      const cached = cache.get(key);

      if (!cached) {
        return undefined;
      }

      if (cached.expiresAt !== Number.POSITIVE_INFINITY && cached.expiresAt <= Date.now()) {
        cache.delete(key);
        notify(key, undefined, cached);
        return undefined;
      }

      return cached as CacheState<Data, Error>;
    },
    set<Data = unknown, Error = unknown>(
      key: string,
      patch: Partial<CacheState<Data, Error>>,
      ttl = 0,
      rawKey?: RawKey,
    ): CacheState<Data, Error> {
      const previous = cloneState(this.get<Data, Error>(key));
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
      const current = this.get<Data, Error>(key) ?? next;
      notify(key, current, previous);
      return current;
    },
  };
}
