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

import { createSWRVClient } from "../client";
import { defaultConfig, client as defaultClient } from "./config";
import { mergeConfigs } from "./merge-config";
import { getScopedMutator } from "./mutate";
import { getScopedPreload } from "./preload";
import { attachProviderEvents } from "../provider-state";

import type {
  AnyConfiguration,
  AnyConfigurationValue,
  AnyContextConfiguration,
  AnyResolvedConfiguration,
  ResolvedSWRVConfiguration,
  SWRVClient,
  SWRVConfigAccessor,
  SWRVConfigComponent,
  SWRVConfiguration,
  SWRVConfigurationValue,
  SWRVContextValue,
} from "../types";

function resolveConfigurationValue<Data = unknown, Error = unknown>(
  parent: ResolvedSWRVConfiguration<Data, Error>,
  value?: SWRVConfigurationValue<Data, Error>,
): SWRVConfiguration<Data, Error> | undefined {
  return typeof value === "function" ? value(parent) : value;
}

function createClientFromConfiguration(
  value: AnyConfiguration | undefined,
  fallback: SWRVClient,
): {
  client: SWRVClient;
  ownsClient: boolean;
} {
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

  const cache = value.provider?.(fallback.cache) ?? value.cache;

  if (!cache || cache === fallback.cache) {
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

const defaultContext = {
  client: defaultClient,
  config: ref({
    cache: defaultClient.cache,
    client: defaultClient,
  } satisfies AnyContextConfiguration),
} satisfies SWRVContextValue;

const contextKey = Symbol("swrv-config");

export function useSWRVContext(): SWRVContextValue {
  if (!getCurrentInstance()) {
    return defaultContext;
  }

  return inject(contextKey, defaultContext);
}

export function useSWRVConfig(): SWRVConfigAccessor {
  const context = useSWRVContext();
  const client = context.client;
  const config = {
    ...defaultConfig,
    ...context.config.value,
  } as AnyResolvedConfiguration;

  return {
    cache: client.cache,
    client,
    config,
    mutate: getScopedMutator(client),
    preload: getScopedPreload(client),
  };
}

export const SWRVConfig = defineComponent({
  name: "SWRVConfig",
  props: {
    value: {
      type: [Object, Function] as PropType<AnyConfigurationValue>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const parentContext = useSWRVContext();
    const isFunctionalConfig = () => typeof props.value === "function";
    const resolvedValue = () =>
      resolveConfigurationValue(
        parentContext.config.value as ResolvedSWRVConfiguration,
        props.value,
      );

    const initialValue = resolvedValue();
    const { client, ownsClient } = createClientFromConfiguration(
      initialValue,
      parentContext.client,
    );
    const resolvedConfig = computed(() => {
      const value = resolvedValue();
      const merged = isFunctionalConfig()
        ? value
        : mergeConfigs(parentContext.config.value as ResolvedSWRVConfiguration, value);

      return {
        ...merged,
        cache: client.cache,
        client,
      };
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

    if (!ownsClient && (initialValue?.initFocus || initialValue?.initReconnect)) {
      const releaseEvents = attachProviderEvents(client.state, {
        initFocus: initialValue.initFocus,
        initReconnect: initialValue.initReconnect,
      });

      onScopeDispose(() => {
        releaseEvents();
      });
    }

    return () => slots.default?.();
  },
}) as SWRVConfigComponent;

export const GLOBAL_SWRV_CLIENT = defaultClient;

SWRVConfig.defaultValue = defaultConfig;

export default SWRVConfig;
