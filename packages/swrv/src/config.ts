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
import { serialize } from "./_internal/serialize";

import type {
  CacheAdapter,
  Compare,
  RawKey,
  ResolvedSWRVConfiguration,
  SWRVClient,
  SWRVConfigAccessor,
  SWRVConfigComponent,
  SWRVConfiguration,
  SWRVContextValue,
} from "./_internal/types";

const defaultCompare: Compare<unknown> = (left, right) => Object.is(left, right);
const noop = () => {};
const defaultIsOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;
const defaultIsVisible = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

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
  onError: noop,
  onSuccess: noop,
  refreshInterval: 0,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  ttl: 0,
};

const defaultClient = createSWRVClient();
const defaultContext = {
  client: defaultClient,
  config: ref(DEFAULT_CONFIGURATION),
} satisfies SWRVContextValue;

const contextKey = Symbol("swrv-config");

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
    return createSWRVClient(value.provider());
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
  merged.onError = override?.onError ?? base.onError ?? noop;
  merged.onSuccess = override?.onSuccess ?? base.onSuccess ?? noop;
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
    preload: <Data = unknown>(key: RawKey, fetcher: () => Promise<Data>) => {
      const [serializedKey] = serialize(key);
      if (!serializedKey) {
        return fetcher();
      }

      return client.preload(serializedKey, fetcher());
    },
  };
}

export const SWRVConfig = defineComponent({
  name: "SWRVConfig",
  props: {
    value: {
      type: Object as PropType<SWRVConfiguration<any, any>>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const parentContext = useSWRVContext();
    const client = createClientFromValue(props.value, parentContext.client);
    const resolvedConfig = computed(() =>
      mergeConfiguration(parentContext.config.value, props.value),
    );

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
