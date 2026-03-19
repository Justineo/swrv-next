import type { Compare, ResolvedSWRVConfiguration, SWRVEventInitializer } from "./types";

const noop = () => {};

export const defaultCompare: Compare<unknown> = (left, right) => Object.is(left, right);

export const defaultInitFocus: SWRVEventInitializer = (callback) => {
  const disposers: Array<() => void> = [];

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("focus", callback);
    disposers.push(() => {
      window.removeEventListener("focus", callback);
    });
  }

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    disposers.push(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    });
  }

  return () => {
    for (const dispose of disposers) {
      dispose();
    }
  };
};

export const defaultInitReconnect: SWRVEventInitializer = (callback) => {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return noop;
  }

  window.addEventListener("online", callback);
  return () => {
    window.removeEventListener("online", callback);
  };
};

export const defaultIsOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;
export const defaultIsVisible = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

export const defaultOnErrorRetry = <Data = unknown, Error = unknown>(
  _error: Error,
  _key: string,
  config: Readonly<ResolvedSWRVConfiguration<Data, Error>>,
  revalidate: (options?: {
    dedupe: boolean;
    retryCount: number;
    throwOnError: boolean;
  }) => Promise<Data | undefined>,
  options: {
    dedupe: boolean;
    retryCount: number;
    throwOnError: boolean;
  },
) => {
  if (options.retryCount > config.errorRetryCount) {
    return;
  }

  setTimeout(() => {
    void revalidate(options);
  }, config.errorRetryInterval);
};

export const INTERNAL_DEFAULT_CONFIGURATION: ResolvedSWRVConfiguration<any, any> = {
  compare: defaultCompare,
  dedupingInterval: 2000,
  errorRetryCount: 5,
  errorRetryInterval: 5000,
  fallback: {},
  focusThrottleInterval: 5000,
  initFocus: defaultInitFocus,
  initReconnect: defaultInitReconnect,
  isOnline: defaultIsOnline,
  isPaused: () => false,
  isVisible: defaultIsVisible,
  keepPreviousData: false,
  loadingTimeout: 3000,
  onDiscarded: noop,
  onError: noop,
  onErrorRetry: defaultOnErrorRetry,
  onLoadingSlow: noop,
  onSuccess: noop,
  refreshInterval: 0,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  strictServerPrefetchWarning: false,
  ttl: 0,
  use: [],
};
