import { createSWRVClient } from "../client";
import { slowConnection } from "./env";
import { getScopedMutator } from "./mutate";
import { getScopedPreload } from "./preload";
import { noop } from "./shared";
import { defaultCompare, defaultConfigOptions, defaultOnErrorRetry, preset } from "./web-preset";

import type { AnyResolvedConfiguration } from "../types";

const client = createSWRVClient();
const cache = client.cache;
const mutate = getScopedMutator(client);
const preload = getScopedPreload(client);
const compare = defaultCompare;

export { cache, client, compare, mutate, preload };

export const defaultConfig: AnyResolvedConfiguration = {
  cache,
  client,
  compare,
  dedupingInterval: 2000,
  errorRetryInterval: slowConnection ? 10000 : 5000,
  fallback: {},
  focusThrottleInterval: 5000,
  initFocus: defaultConfigOptions.initFocus,
  initReconnect: defaultConfigOptions.initReconnect,
  isOnline: preset.isOnline,
  isPaused: () => false,
  isVisible: preset.isVisible,
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
