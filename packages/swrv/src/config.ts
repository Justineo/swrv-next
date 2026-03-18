import {
  computed,
  defineComponent,
  getCurrentInstance,
  inject,
  provide,
  ref,
  type PropType,
} from "vue";

import { createSWRVClient } from "./_internal/client";
import { createScopedMutator } from "./_internal/mutate";
import { preloadKey } from "./_internal/preload";

import type {
  CacheAdapter,
  Compare,
  ResolvedSWRVConfiguration,
  SWRVClient,
  SWRVConfigAccessor,
  SWRVConfigComponent,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVContextValue,
} from "./_internal/types";

const defaultCompare: Compare<unknown> = (left, right) => Object.is(left, right);
const noop = () => {};
const defaultIsOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;
const defaultIsVisible = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";
const defaultOnErrorRetry = <Data = unknown, Error = unknown>(
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

const DEFAULT_CONFIGURATION: ResolvedSWRVConfiguration<any, any> = {
  compare: defaultCompare,
  dedupingInterval: 2000,
  errorRetryCount: 5,
  errorRetryInterval: 5000,
  fallback: {},
  focusThrottleInterval: 5000,
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
  ttl: 0,
  use: [],
};

const defaultClient = createSWRVClient();
const defaultContext = {
  client: defaultClient,
  config: ref(DEFAULT_CONFIGURATION),
} satisfies SWRVContextValue;

const contextKey = Symbol("swrv-config");

function resolveConfigurationValue<Data = unknown, Error = unknown>(
  parent: ResolvedSWRVConfiguration<Data, Error>,
  value?: SWRVConfigurationValue<Data, Error>,
) {
  return typeof value === "function" ? value(parent) : value;
}

function createClientFromValue(
  value: SWRVConfiguration<any, any> | undefined,
  fallback: SWRVClient,
) {
  if (!value) {
    return fallback;
  }

  if (value.client) {
    return value.client;
  }

  if (value.cache) {
    return createSWRVClient(value.cache);
  }

  if (value.provider) {
    return createSWRVClient(value.provider(fallback.cache));
  }

  return fallback;
}

export function mergeConfiguration<Data = unknown, Error = unknown>(
  base: ResolvedSWRVConfiguration<Data, Error>,
  override?: SWRVConfiguration<Data, Error>,
): ResolvedSWRVConfiguration<Data, Error> {
  const merged = {
    ...base,
    ...override,
  } satisfies ResolvedSWRVConfiguration<Data, Error>;

  merged.compare = override?.compare ?? base.compare ?? defaultCompare;
  merged.fallback =
    base.fallback && override?.fallback
      ? { ...base.fallback, ...override.fallback }
      : (override?.fallback ?? base.fallback ?? {});
  merged.isOnline = override?.isOnline ?? base.isOnline ?? defaultIsOnline;
  merged.isPaused = override?.isPaused ?? base.isPaused ?? (() => false);
  merged.isVisible = override?.isVisible ?? base.isVisible ?? defaultIsVisible;
  merged.loadingTimeout = override?.loadingTimeout ?? base.loadingTimeout ?? 3000;
  merged.onDiscarded = override?.onDiscarded ?? base.onDiscarded ?? noop;
  merged.onError = override?.onError ?? base.onError ?? noop;
  merged.onErrorRetry = override?.onErrorRetry ?? base.onErrorRetry ?? defaultOnErrorRetry;
  merged.onLoadingSlow = override?.onLoadingSlow ?? base.onLoadingSlow ?? noop;
  merged.onSuccess = override?.onSuccess ?? base.onSuccess ?? noop;
  merged.use =
    base.use && override?.use ? base.use.concat(override.use) : (override?.use ?? base.use ?? []);
  return merged;
}

export function useSWRVContext(): SWRVContextValue {
  if (!getCurrentInstance()) {
    return defaultContext;
  }

  return inject(contextKey, defaultContext);
}

export function useSWRVConfig(): SWRVConfigAccessor {
  const context = useSWRVContext();
  const client = context.client;
  const config = context.config.value;
  const mutate = createScopedMutator(client);

  return {
    cache: client.cache,
    client,
    config,
    mutate,
    preload: (key, fetcher) => preloadKey(client, key, fetcher),
  };
}

export const SWRVConfig = defineComponent({
  name: "SWRVConfig",
  props: {
    value: {
      type: [Object, Function] as PropType<SWRVConfigurationValue<any, any>>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const parentContext = useSWRVContext();
    const resolvedValue = () => resolveConfigurationValue(parentContext.config.value, props.value);
    const client = createClientFromValue(resolvedValue(), parentContext.client);
    const resolvedConfig = computed(() => {
      const value = resolvedValue();
      if (typeof props.value === "function") {
        return mergeConfiguration(INTERNAL_DEFAULT_CONFIGURATION, value);
      }

      return mergeConfiguration(parentContext.config.value, value);
    });

    provide(contextKey, {
      client,
      config: resolvedConfig,
    });

    return () => slots.default?.();
  },
}) as SWRVConfigComponent;

export function createCacheProvider<Value = unknown>(): CacheAdapter<Value> {
  return new Map<string, Value>();
}

export const INTERNAL_DEFAULT_CONFIGURATION = DEFAULT_CONFIGURATION;
export const GLOBAL_SWRV_CLIENT = defaultClient;
