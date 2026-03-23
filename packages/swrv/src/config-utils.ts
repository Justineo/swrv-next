import { createSWRVClient } from "./_internal/client";
import { defaultConfig } from "./_internal/config";
import { mergeConfigs } from "./_internal/merge-config";

import type {
  AnyConfiguration,
  ResolvedSWRVConfiguration,
  SWRVClient,
  SWRVConfiguration,
  SWRVConfigurationValue,
} from "./_internal/types";

export function resolveConfigurationValue<Data = unknown, Error = unknown>(
  parent: ResolvedSWRVConfiguration<Data, Error>,
  value?: SWRVConfigurationValue<Data, Error>,
): SWRVConfiguration<Data, Error> | undefined {
  return typeof value === "function" ? value(parent) : value;
}

export function createClientFromConfiguration(
  value: AnyConfiguration | undefined,
  fallback: SWRVClient,
): {
  client: SWRVClient;
  ownsClient: boolean;
} {
  // `client`, `cache`, `provider`, `initFocus`, and `initReconnect` define the
  // cache boundary itself. They are resolved once when the provider boundary is
  // created, while request-time behavior stays reactive through merged config
  // reads inside hooks.
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

export {
  defaultConfig as INTERNAL_DEFAULT_CONFIGURATION,
  mergeConfigs as mergeConfiguration,
  mergeConfigs,
};
