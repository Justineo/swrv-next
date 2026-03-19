import {
  computed,
  defineComponent,
  getCurrentInstance,
  inject,
  onScopeDispose,
  provide,
  ref,
  type PropType,
} from "vue";

import { getScopedMutator } from "./_internal/mutate";
import { getScopedPreload } from "./_internal/preload";
import { createSWRVClient } from "./_internal/client";
import {
  INTERNAL_DEFAULT_CONFIGURATION,
  defaultCompare,
  defaultInitFocus,
  defaultInitReconnect,
  defaultIsOnline,
  defaultIsVisible,
  defaultOnErrorRetry,
} from "./_internal/web-preset";

import type {
  CacheAdapter,
  ResolvedSWRVConfiguration,
  SWRVClient,
  SWRVConfigAccessor,
  SWRVConfigComponent,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVContextValue,
} from "./_internal/types";

const noop = () => {};
const defaultClient = createSWRVClient();
const defaultContext = {
  client: defaultClient,
  config: ref(INTERNAL_DEFAULT_CONFIGURATION),
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
    return {
      client: fallback,
      ownsClient: false,
    };
  }

  if (value.client) {
    return {
      client: value.client,
      ownsClient: false,
    };
  }

  const cache =
    value.provider?.(fallback.cache) ??
    value.cache ??
    (value.initFocus || value.initReconnect ? fallback.cache : undefined);

  if (!cache) {
    return {
      client: fallback,
      ownsClient: false,
    };
  }

  return {
    client: createSWRVClient(cache, {
      initFocus: value.initFocus,
      initReconnect: value.initReconnect,
    }),
    ownsClient: true,
  };
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
  merged.initFocus = override?.initFocus ?? base.initFocus ?? defaultInitFocus;
  merged.initReconnect = override?.initReconnect ?? base.initReconnect ?? defaultInitReconnect;
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
  const mutate = getScopedMutator(client);
  const scopedPreload = getScopedPreload(client);

  return {
    cache: client.cache,
    client,
    config,
    mutate,
    preload: scopedPreload,
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
    const { client, ownsClient } = createClientFromValue(resolvedValue(), parentContext.client);
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

    if (ownsClient) {
      onScopeDispose(() => {
        client.dispose();
      });
    }

    return () => slots.default?.();
  },
}) as SWRVConfigComponent;

export function createCacheProvider<Value = unknown>(): CacheAdapter<Value> {
  return new Map<string, Value>();
}

export const GLOBAL_SWRV_CLIENT = defaultClient;

SWRVConfig.defaultValue = INTERNAL_DEFAULT_CONFIGURATION;
