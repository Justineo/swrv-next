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

import { client as defaultClient, defaultConfig } from "./_internal/config";
import { getScopedMutator } from "./_internal/mutate";
import { getScopedPreload } from "./_internal/preload";
import { attachProviderEvents } from "./_internal/provider-state";
import {
  createClientFromConfiguration,
  mergeConfigs,
  resolveConfigurationValue,
} from "./config-utils";

import type {
  AnyConfigurationValue,
  SWRVConfigAccessor,
  SWRVConfigComponent,
  SWRVContextValue,
} from "./_internal/types";

const defaultContext = {
  client: defaultClient,
  config: ref(defaultConfig),
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
      type: [Object, Function] as PropType<AnyConfigurationValue>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const parentContext = useSWRVContext();
    const resolvedValue = () => resolveConfigurationValue(parentContext.config.value, props.value);

    // Provider boundaries behave like SWR cache providers: boundary-defining
    // inputs are captured once for this instance, while later reactive updates
    // only affect request-time options exposed through `resolvedConfig`.
    const initialValue = resolvedValue();
    const { client, ownsClient } = createClientFromConfiguration(
      initialValue,
      parentContext.client,
    );
    const resolvedConfig = computed(() => {
      const value = resolvedValue();
      const merged =
        typeof props.value === "function"
          ? mergeConfigs(defaultConfig, value)
          : mergeConfigs(parentContext.config.value, value);

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

    // Reused boundaries can still layer custom event initializers over the
    // shared client without creating a shadow cache boundary.
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
