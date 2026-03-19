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
  AnyConfiguration,
  ResolvedSWRVConfiguration,
  SWRVClient,
  SWRVConfiguration,
  SWRVConfigurationValue,
} from "./_internal/types";

const noop = () => {};

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

export { INTERNAL_DEFAULT_CONFIGURATION };
