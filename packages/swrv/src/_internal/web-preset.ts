import { dequal } from "dequal/lite";

import { slowConnection } from "./env";

import type {
  AnyResolvedConfiguration,
  Compare,
  ResolvedSWRVConfiguration,
  SWRVEventInitializer,
} from "./types";

const noop = () => {};

let online = true;

export const defaultCompare: Compare<unknown> = dequal;

export const defaultInitFocus: SWRVEventInitializer = (callback) => {
  const disposers: Array<() => void> = [];

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("focus", callback);
    disposers.push(() => {
      window.removeEventListener("focus", callback);
    });
  }

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", callback);
    disposers.push(() => {
      document.removeEventListener("visibilitychange", callback);
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

  const handleOnline = () => {
    online = true;
    callback();
  };
  const handleOffline = () => {
    online = false;
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
};

export const defaultIsOnline = () => online;
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
  const retryCount = options.retryCount < 8 ? options.retryCount : 8;
  const timeout = Math.trunc((Math.random() + 0.5) * (1 << retryCount)) * config.errorRetryInterval;

  if (config.errorRetryCount !== undefined && options.retryCount > config.errorRetryCount) {
    return;
  }

  setTimeout(() => {
    void revalidate(options);
  }, timeout);
};

export const INTERNAL_DEFAULT_CONFIGURATION: AnyResolvedConfiguration = {
  compare: defaultCompare,
  dedupingInterval: 2000,
  errorRetryInterval: slowConnection ? 10000 : 5000,
  fallback: {},
  focusThrottleInterval: 5000,
  initFocus: defaultInitFocus,
  initReconnect: defaultInitReconnect,
  isOnline: defaultIsOnline,
  isPaused: () => false,
  isVisible: defaultIsVisible,
  keepPreviousData: false,
  loadingTimeout: slowConnection ? 5000 : 3000,
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
  use: [],
};
