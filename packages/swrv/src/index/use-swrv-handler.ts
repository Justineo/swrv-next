import { getCurrentScope, onScopeDispose, ref, watch } from "vue";

import { mergeConfigs } from "../_internal/merge-config";
import * as revalidateEvents from "../_internal/events";
import { isServerEnvironment } from "../_internal/env";
import { getScopedMutator } from "../_internal/mutate";
import { callFetcher, resolveKeyValue, serialize } from "../_internal/serialize";
import { warnMissingServerPrefetch } from "../_internal/server-prefetch-warning";
import { getTimestamp } from "../_internal/timestamp";
import { useSWRVContext } from "../config-context";

import type {
  BareFetcher,
  CacheState,
  KeySource,
  MutatorCallback,
  MutatorOptions,
  RawKey,
  RevalidateEvent,
  RevalidateEventOptions,
  RevalidateOptions,
  ResolvedSWRVConfiguration,
  SWRVConfiguration,
  SWRVResponse,
} from "../_internal/types";

type CurrentKeyState = {
  rawKey: RawKey;
  serializedKey: string;
};

function hasDefinedValue<Data>(value: Data | undefined): value is Data {
  return value !== undefined;
}

function resolveRetryableError<ErrorType = unknown>(
  option: boolean | ((error: ErrorType) => boolean),
  error: ErrorType,
): boolean {
  return typeof option === "function" ? option(error) : option !== false;
}

function isActive<Data, Error>(config: ResolvedSWRVConfiguration<Data, Error>): boolean {
  return config.isVisible() && config.isOnline();
}

function resolveDataValue<Data>(
  cachedData: Data | undefined,
  fallbackData: Data | undefined,
): Data | undefined {
  return hasDefinedValue(cachedData) ? cachedData : fallbackData;
}

function resolveFallbackData<Data, Error>(
  serializedKey: string,
  config: ResolvedSWRVConfiguration<Data, Error>,
): Data | undefined {
  if (hasDefinedValue(config.fallbackData)) {
    return config.fallbackData;
  }

  if (!serializedKey) {
    return undefined;
  }

  return config.fallback[serializedKey] as Data | undefined;
}

function shouldRevalidateOnActivation<Data, Error>(
  isInitialActivation: boolean,
  currentData: Data | undefined,
  hasFetcher: boolean,
  hasRevalidator: boolean,
  currentError: Error | undefined,
  config: ResolvedSWRVConfiguration<Data, Error>,
): boolean {
  if (!hasFetcher) {
    return false;
  }

  if (hasRevalidator && hasDefinedValue(currentError)) {
    return false;
  }

  if (isInitialActivation && config.revalidateOnMount !== undefined) {
    return config.revalidateOnMount;
  }

  return !hasDefinedValue(currentData) || config.revalidateIfStale;
}

export function useSWRVHandler<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher?: BareFetcher<Data> | null,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error> {
  if (!getCurrentScope()) {
    throw new Error("useSWRV must be called inside setup() or an active effect scope.");
  }

  const context = useSWRVContext();
  const getConfig = () =>
    mergeConfigs(context.config.value as ResolvedSWRVConfiguration<Data, Error>, config);
  const client = context.client;
  const scopedMutate = getScopedMutator(client);
  const serverPrefetchStorageKey = client.cache as object;

  const data = ref<Data | undefined>(config?.fallbackData);
  const error = ref<Error | undefined>();
  const isLoading = ref(false);
  const isValidating = ref(false);
  const laggyData = ref<Data | undefined>(config?.fallbackData);

  const currentKey = ref<CurrentKeyState>({
    rawKey: resolveKeyValue(key as RawKey | (() => RawKey)),
    serializedKey: "",
  });

  let unsubscribeCache = () => {};
  let unsubscribeRevalidator = () => {};
  let loadingSlowTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let activeCacheSubscriptionKey = "";
  let disposed = false;
  let hasMounted = false;
  let nextFocusRevalidatedAt = 0;

  const clearRefreshTimer = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = undefined;
    }
  };

  const clearLoadingSlowTimer = () => {
    if (loadingSlowTimer) {
      clearTimeout(loadingSlowTimer);
      loadingSlowTimer = undefined;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  const clearTimers = () => {
    clearLoadingSlowTimer();
    clearRefreshTimer();
    clearRetryTimer();
  };

  const applyState = (
    entry?: CacheState<Data, Error>,
    serializedKey = currentKey.value.serializedKey,
  ) => {
    const configValue = getConfig();
    const fallbackData = resolveFallbackData(serializedKey, configValue);
    const resolvedEntry =
      entry ?? (serializedKey ? client.getState<Data, Error>(serializedKey) : undefined);
    const resolvedData = resolvedEntry
      ? resolveDataValue(resolvedEntry.data, fallbackData)
      : fallbackData;

    if (!resolvedEntry) {
      data.value =
        configValue.keepPreviousData && hasDefinedValue(laggyData.value)
          ? laggyData.value
          : fallbackData;
      if (hasDefinedValue(data.value)) {
        laggyData.value = data.value;
      }
      return;
    }

    data.value =
      configValue.keepPreviousData &&
      !hasDefinedValue(resolvedEntry.data) &&
      hasDefinedValue(laggyData.value)
        ? laggyData.value
        : resolvedData;
    error.value = resolvedEntry.error;
    isLoading.value = resolvedEntry.isLoading;
    isValidating.value = resolvedEntry.isValidating;

    if (hasDefinedValue(data.value)) {
      laggyData.value = data.value;
    }
  };

  const syncAfterStateWrite = (serializedKey: string, entry?: CacheState<Data, Error>) => {
    if (
      currentKey.value.serializedKey !== serializedKey ||
      activeCacheSubscriptionKey === serializedKey
    ) {
      return;
    }

    applyState(entry, serializedKey);
  };

  const writeState = (
    serializedKey: string,
    rawKey: RawKey,
    patch: Partial<CacheState<Data, Error>>,
  ) => {
    return client.setState<Data, Error>(serializedKey, patch, rawKey);
  };

  const scheduleRefresh = () => {
    clearRefreshTimer();

    const configValue = getConfig();
    const interval =
      typeof configValue.refreshInterval === "function"
        ? configValue.refreshInterval(data.value)
        : configValue.refreshInterval;

    if (!interval || !currentKey.value.serializedKey) {
      return;
    }

    refreshTimer = setTimeout(() => {
      if (configValue.isPaused()) {
        scheduleRefresh();
        return;
      }

      const currentState = client.getState<Data, Error>(currentKey.value.serializedKey);

      if (currentState?.error) {
        scheduleRefresh();
        return;
      }

      if (!configValue.refreshWhenHidden && !configValue.isVisible()) {
        scheduleRefresh();
        return;
      }

      if (!configValue.refreshWhenOffline && !configValue.isOnline()) {
        scheduleRefresh();
        return;
      }

      void revalidate({ dedupe: true });
    }, interval);
  };

  const revalidate = async (options: RevalidateOptions = {}) => {
    const configValue = getConfig();
    const activeFetcher = (fetcher ?? configValue.fetcher) as BareFetcher<Data> | null | undefined;

    const [serializedKey, rawKey] = serialize(key as RawKey | (() => RawKey));
    currentKey.value = { rawKey, serializedKey };

    if (!serializedKey) {
      isLoading.value = false;
      isValidating.value = false;
      return undefined;
    }

    const isActiveKey = () => currentKey.value.serializedKey === serializedKey;

    const cached = client.getState<Data, Error>(serializedKey);
    if (cached) {
      applyState(cached, serializedKey);
    }

    if (configValue.isPaused()) {
      scheduleRefresh();
      return cached?.data;
    }

    if (!activeFetcher) {
      scheduleRefresh();
      return cached?.data;
    }

    if (!options.force) {
      if (!configValue.refreshWhenHidden && !configValue.isVisible()) {
        scheduleRefresh();
        return cached?.data;
      }

      if (!configValue.refreshWhenOffline && !configValue.isOnline()) {
        scheduleRefresh();
        return cached?.data;
      }
    }

    const now = getTimestamp();
    const latestMutation = client.getMutation(serializedKey);
    const fetchTimestamp =
      latestMutation && now <= latestMutation[1] ? latestMutation[1] + 0.001 : now;
    const currentFetch =
      options.dedupe === false
        ? undefined
        : client.getFetch(serializedKey, fetchTimestamp, configValue.dedupingInterval);

    const startedAt = currentFetch?.startedAt ?? fetchTimestamp;
    let fetchPromise = currentFetch?.promise as Promise<Data> | undefined;

    if (!currentFetch) {
      const loadingState = writeState(serializedKey, rawKey, {
        data: cached?.data,
        error: cached?.error,
        isLoading: cached?.data === undefined,
        isValidating: true,
      });
      syncAfterStateWrite(serializedKey, loadingState);

      const preloaded = client.consumePreload<Data>(serializedKey);
      fetchPromise = preloaded ?? callFetcher(activeFetcher, rawKey);

      client.startFetch(serializedKey, fetchPromise, startedAt, configValue.dedupingInterval);

      if (configValue.loadingTimeout > 0 && cached?.data === undefined) {
        clearLoadingSlowTimer();
        loadingSlowTimer = setTimeout(() => {
          const latestState = client.getState<Data, Error>(serializedKey);
          if (
            disposed ||
            currentKey.value.serializedKey !== serializedKey ||
            !client.isLatestFetch(serializedKey, startedAt) ||
            latestState?.data !== undefined ||
            !latestState?.isLoading
          ) {
            return;
          }

          const latestConfig = getConfig();
          latestConfig.onLoadingSlow(serializedKey, latestConfig);
        }, configValue.loadingTimeout);
      }
    }

    try {
      const resolvedData = (await fetchPromise) as Data;
      clearLoadingSlowTimer();

      if (getConfig().isPaused()) {
        const pausedState = writeState(serializedKey, rawKey, {
          isLoading: false,
          isValidating: false,
        });
        syncAfterStateWrite(serializedKey, pausedState);
        if (isActiveKey()) {
          scheduleRefresh();
        }
        return pausedState.data;
      }

      if (!client.isLatestFetch(serializedKey, startedAt)) {
        if (!currentFetch) {
          getConfig().onDiscarded(serializedKey);
        }
        return client.getState<Data, Error>(serializedKey)?.data;
      }

      const mutation = client.getMutation(serializedKey);
      if (mutation && (startedAt <= mutation[0] || startedAt <= mutation[1] || mutation[1] === 0)) {
        if (!currentFetch) {
          getConfig().onDiscarded(serializedKey);
        }
        return client.getState<Data, Error>(serializedKey)?.data;
      }

      const latestData = client.getState<Data, Error>(serializedKey)?.data;
      const successState = writeState(serializedKey, rawKey, {
        data: configValue.compare(latestData, resolvedData) ? latestData : resolvedData,
        error: undefined,
        isLoading: false,
        isValidating: false,
      });
      syncAfterStateWrite(serializedKey, successState);
      if (!currentFetch && isActiveKey()) {
        getConfig().onSuccess(resolvedData, serializedKey, getConfig());
      }
      if (isActiveKey()) {
        scheduleRefresh();
      }
      return resolvedData;
    } catch (caught) {
      const resolvedError = caught as Error;
      clearLoadingSlowTimer();

      if (getConfig().isPaused()) {
        const pausedErrorState = writeState(serializedKey, rawKey, {
          isLoading: false,
          isValidating: false,
        });
        syncAfterStateWrite(serializedKey, pausedErrorState);
        if (isActiveKey()) {
          scheduleRefresh();
        }
        return pausedErrorState.data;
      }

      const errorState = writeState(serializedKey, rawKey, {
        error: resolvedError,
        isLoading: false,
        isValidating: false,
      });
      syncAfterStateWrite(serializedKey, errorState);

      const latestConfig = getConfig();
      if (!currentFetch && isActiveKey()) {
        latestConfig.onError(resolvedError, serializedKey, latestConfig);
      }

      const shouldRetry = resolveRetryableError(latestConfig.shouldRetryOnError, resolvedError);
      const shouldRetryWhileActive =
        shouldRetry &&
        !disposed &&
        isActiveKey() &&
        (!latestConfig.revalidateOnFocus ||
          !latestConfig.revalidateOnReconnect ||
          isActive(latestConfig));

      if (shouldRetryWhileActive && !currentFetch) {
        clearRetryTimer();
        latestConfig.onErrorRetry(
          resolvedError,
          serializedKey,
          latestConfig,
          (retryOptions) => {
            if (disposed || currentKey.value.serializedKey !== serializedKey) {
              return Promise.resolve(client.getState<Data, Error>(serializedKey)?.data);
            }

            return revalidate({
              dedupe: retryOptions?.dedupe ?? true,
              retryCount: retryOptions?.retryCount ?? (options.retryCount ?? 0) + 1,
              throwOnError: retryOptions?.throwOnError ?? false,
            });
          },
          {
            dedupe: true,
            retryCount: (options.retryCount ?? 0) + 1,
            throwOnError: false,
          },
        );
      }

      if (options.throwOnError && isActiveKey()) {
        throw resolvedError;
      }

      if (isActiveKey()) {
        scheduleRefresh();
      }
      return cached?.data;
    }
  };

  const bindCurrentKey = (event: RevalidateEvent, options?: RevalidateEventOptions) => {
    const configValue = getConfig();
    if (event === revalidateEvents.FOCUS_EVENT) {
      if (!configValue.revalidateOnFocus) {
        return undefined;
      }

      const now = Date.now();
      if (!isActive(configValue) || now < nextFocusRevalidatedAt) {
        return undefined;
      }

      nextFocusRevalidatedAt = now + configValue.focusThrottleInterval;
    }

    if (
      event === revalidateEvents.RECONNECT_EVENT &&
      (!configValue.revalidateOnReconnect || !isActive(configValue))
    ) {
      return undefined;
    }

    if (event === revalidateEvents.MUTATE_EVENT) {
      const shouldRevalidate =
        typeof options?.revalidate === "function"
          ? options.revalidate(data.value, currentKey.value.rawKey)
          : options?.revalidate !== false;

      if (!shouldRevalidate) {
        scheduleRefresh();
        return undefined;
      }
    }

    return revalidate({
      dedupe: options?.dedupe ?? true,
      force: options?.force ?? event === revalidateEvents.MUTATE_EVENT,
      throwOnError: options?.throwOnError,
    });
  };

  const resetSubscriptions = () => {
    unsubscribeCache();
    unsubscribeRevalidator();
    unsubscribeCache = () => {};
    unsubscribeRevalidator = () => {};
    activeCacheSubscriptionKey = "";
  };

  watch(
    () => {
      const configValue = getConfig();
      const refreshInterval =
        typeof configValue.refreshInterval === "function"
          ? configValue.refreshInterval(data.value)
          : configValue.refreshInterval;

      return [
        refreshInterval,
        configValue.refreshWhenHidden,
        configValue.refreshWhenOffline,
        configValue.isPaused(),
      ];
    },
    () => {
      if (!hasMounted || !currentKey.value.serializedKey) {
        return;
      }

      clearRefreshTimer();

      if (isValidating.value) {
        return;
      }

      scheduleRefresh();
    },
  );

  watch(
    () => serialize(key as RawKey | (() => RawKey))[0],
    async (serializedKey) => {
      clearTimers();
      resetSubscriptions();

      const isInitialActivation = !hasMounted;
      const configValue = getConfig();
      const rawKey = resolveKeyValue(key as RawKey | (() => RawKey));
      const fallbackData = resolveFallbackData(serializedKey, configValue);
      currentKey.value = { rawKey, serializedKey };

      if (!serializedKey) {
        nextFocusRevalidatedAt = 0;
        if (!configValue.keepPreviousData) {
          data.value = fallbackData;
          if (hasDefinedValue(data.value)) {
            laggyData.value = data.value;
          }
          error.value = undefined;
        }
        isLoading.value = false;
        isValidating.value = false;
        hasMounted = true;
        return;
      }

      const hasExistingRevalidator = (client.state.revalidators.get(serializedKey)?.size ?? 0) > 0;

      unsubscribeCache = client.subscribe(serializedKey, (current) => {
        applyState(current as CacheState<Data, Error> | undefined, serializedKey);
      });
      activeCacheSubscriptionKey = serializedKey;
      unsubscribeRevalidator = client.addRevalidator(serializedKey, bindCurrentKey);

      const cached = client.getState<Data, Error>(serializedKey);
      const resolvedData = resolveDataValue(cached?.data, fallbackData);

      if (
        configValue.strictServerPrefetchWarning &&
        isServerEnvironment() &&
        serializedKey &&
        !hasDefinedValue(resolvedData) &&
        Boolean(fetcher ?? configValue.fetcher)
      ) {
        warnMissingServerPrefetch(serverPrefetchStorageKey, serializedKey);
      }

      if (cached) {
        applyState(cached, serializedKey);
      } else if (!configValue.keepPreviousData) {
        data.value = fallbackData;
        if (hasDefinedValue(data.value)) {
          laggyData.value = data.value;
        }
        error.value = undefined;
        isLoading.value = false;
        isValidating.value = false;
      }

      nextFocusRevalidatedAt = configValue.revalidateOnFocus
        ? Date.now() + configValue.focusThrottleInterval
        : 0;

      if (isServerEnvironment()) {
        hasMounted = true;
        return;
      }

      if (
        shouldRevalidateOnActivation(
          isInitialActivation,
          resolvedData,
          Boolean(fetcher ?? configValue.fetcher) && !configValue.isPaused(),
          hasExistingRevalidator,
          cached?.error,
          configValue,
        )
      ) {
        hasMounted = true;
        await revalidate({
          dedupe: true,
          force: true,
        });
        return;
      }

      hasMounted = true;
      scheduleRefresh();
    },
    {
      immediate: true,
    },
  );

  onScopeDispose(() => {
    disposed = true;
    clearTimers();
    resetSubscriptions();
  });

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: async function mutate<MutationData = Data>(
      value?:
        | MutationData
        | Promise<MutationData | undefined>
        | MutatorCallback<Data, MutationData>,
      options?: boolean | MutatorOptions<Data, MutationData>,
    ) {
      if (arguments.length === 0) {
        return (await scopedMutate<Data>(currentKey.value.rawKey)) as Data | undefined;
      }

      return (await scopedMutate<Data, MutationData>(currentKey.value.rawKey, value, options)) as
        | Data
        | MutationData
        | undefined;
    },
  } as SWRVResponse<Data, Error>;
}
