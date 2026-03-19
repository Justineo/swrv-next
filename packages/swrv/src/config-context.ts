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

import { createSWRVClient } from "./_internal/client";
import { getScopedMutator } from "./_internal/mutate";
import { getScopedPreload } from "./_internal/preload";
import { attachProviderEvents } from "./_internal/provider-state";
import {
  createClientFromConfiguration,
  mergeConfiguration,
  resolveConfigurationValue,
} from "./config-utils";
import { INTERNAL_DEFAULT_CONFIGURATION } from "./config-utils";

import type {
  SWRVConfigAccessor,
  SWRVConfigComponent,
  SWRVConfigurationValue,
  SWRVContextValue,
} from "./_internal/types";

const defaultClient = createSWRVClient();
const defaultContext = {
  client: defaultClient,
  config: ref(INTERNAL_DEFAULT_CONFIGURATION),
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
  const config = context.config.value;

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
      type: [Object, Function] as PropType<SWRVConfigurationValue<any, any>>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const parentContext = useSWRVContext();
    const resolvedValue = () => resolveConfigurationValue(parentContext.config.value, props.value);
    const initialValue = resolvedValue();
    const { client, ownsClient } = createClientFromConfiguration(
      initialValue,
      parentContext.client,
    );
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

SWRVConfig.defaultValue = INTERNAL_DEFAULT_CONFIGURATION;
