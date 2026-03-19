import type { AnyCacheState, CacheAdapter, CacheState, RawKey } from "./types";

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
    rawKey?: RawKey,
  ): CacheState<Data, Error>;
}

export function createCacheHelper(
  cache: CacheAdapter<AnyCacheState>,
  notify: (
    key: string,
    current: AnyCacheState | undefined,
    previous: AnyCacheState | undefined,
  ) => void,
): SWRVCacheHelper {
  return {
    get<Data = unknown, Error = unknown>(key: string): CacheState<Data, Error> | undefined {
      return cache.get(key) as CacheState<Data, Error> | undefined;
    },
    set<Data = unknown, Error = unknown>(
      key: string,
      patch: Partial<CacheState<Data, Error>>,
      rawKey?: RawKey,
    ): CacheState<Data, Error> {
      const previous = cloneState(this.get<Data, Error>(key));
      const next = {
        data: previous?.data,
        error: previous?.error,
        isLoading: previous?.isLoading ?? false,
        isValidating: previous?.isValidating ?? false,
        _c: previous?._c,
        _k: rawKey ?? previous?._k,
        ...patch,
      } satisfies CacheState<Data, Error>;

      cache.set(key, next);
      const current = this.get<Data, Error>(key) ?? next;
      notify(key, current, previous);
      return current;
    },
  };
}
