import { getCurrentScope, onScopeDispose, ref, watch } from "vue";

import { mergeConfiguration, useSWRVContext } from "./config";
import { createScopedMutator } from "./_internal/mutate";
import { callFetcher, resolveKeyValue, serialize } from "./_internal/serialize";

import type {
  BareFetcher,
  FetcherResponse,
  KeySource,
  MutatorOptions,
  RawKey,
  RevalidateEventOptions,
  RevalidateOptions,
  ResolvedSWRVConfiguration,
  SWRVConfiguration,
  SWRVResponse,
} from "./_internal/types";

type CurrentKeyState = {
  rawKey: RawKey;
  serializedKey: string;
};

type NonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;

function hasDefinedValue<Data>(value: Data | undefined): value is Data {
  return value !== undefined;
}

function resolveRetryableError<ErrorType = unknown>(
  option: boolean | ((error: ErrorType) => boolean),
  error: ErrorType,
) {
  return typeof option === "function" ? option(error) : option !== false;
}

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

function isNavigatorOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function isActive() {
  return isDocumentVisible() && isNavigatorOnline();
}

function resolveResolvedData<Data>(cachedData: Data | undefined, fallbackData: Data | undefined) {
  return hasDefinedValue(cachedData) ? cachedData : fallbackData;
}

function resolveFallbackData<Data>(
  serializedKey: string,
  config: ResolvedSWRVConfiguration<Data, any>,
) {
  if (hasDefinedValue(config.fallbackData)) {
    return config.fallbackData;
  }

  if (!serializedKey) {
    return undefined;
  }

  return config.fallback[serializedKey] as Data | undefined;
}

function shouldRevalidateOnActivation<Data>(
  isInitialActivation: boolean,
  currentData: Data | undefined,
  hasFetcher: boolean,
  config: ResolvedSWRVConfiguration<Data, any>,
) {
  if (!hasFetcher) {
    return false;
  }

  if (isInitialActivation && config.revalidateOnMount !== undefined) {
    return config.revalidateOnMount;
  }

  return !hasDefinedValue(currentData) || config.revalidateIfStale;
}

export function unstable_serialize(key: RawKey | (() => RawKey)) {
  return serialize(key)[0];
}

export default function useSWRV<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  key: KeySource<Key>,
): SWRVResponse<Data, Error>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<Key>,
  fetcher: ((...args: Key) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  key: KeySource<Key>,
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher: BareFetcher<Data> | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher?: BareFetcher<Data> | null,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error> {
  if (!getCurrentScope()) {
    throw new Error("useSWRV must be called inside setup() or an active effect scope.");
  }

  const context = useSWRVContext();
  const mergedConfig = () => mergeConfiguration(context.config.value, config);
  const client = context.client;
  const scopedMutate = createScopedMutator(client);

  const data = ref<Data | undefined>(config?.fallbackData);
  const error = ref<Error | undefined>();
  const isLoading = ref(false);
  const isValidating = ref(false);

  const currentKey = ref<CurrentKeyState>({
    rawKey: resolveKeyValue(key as RawKey | (() => RawKey)),
    serializedKey: "",
  });

  let unsubscribeCache = () => {};
  let unsubscribeRevalidator = () => {};
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let hasMounted = false;
  let nextFocusRevalidatedAt = 0;

  const clearRefreshTimer = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = undefined;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  const clearTimers = () => {
    clearRefreshTimer();
    clearRetryTimer();
  };

  const applyState = () => {
    const configValue = mergedConfig();
    const fallbackData = resolveFallbackData(currentKey.value.serializedKey, configValue);
    const entry = currentKey.value.serializedKey
      ? client.getState<Data, Error>(currentKey.value.serializedKey)
      : undefined;

    if (!entry) {
      data.value = fallbackData;
      return;
    }

    data.value = resolveResolvedData(entry.data, fallbackData);
    error.value = entry.error;
    isLoading.value = entry.isLoading;
    isValidating.value = entry.isValidating;
  };

  const scheduleRefresh = () => {
    clearRefreshTimer();

    const configValue = mergedConfig();
    const interval =
      typeof configValue.refreshInterval === "function"
        ? configValue.refreshInterval(data.value)
        : configValue.refreshInterval;

    if (!interval || !currentKey.value.serializedKey) {
      return;
    }

    refreshTimer = setTimeout(() => {
      const currentState = client.getState<Data, Error>(currentKey.value.serializedKey);

      if (currentState?.error) {
        scheduleRefresh();
        return;
      }

      if (!configValue.refreshWhenHidden && !isDocumentVisible()) {
        scheduleRefresh();
        return;
      }

      if (!configValue.refreshWhenOffline && !isNavigatorOnline()) {
        scheduleRefresh();
        return;
      }

      void revalidate({ dedupe: true });
    }, interval);
  };

  const revalidate = async (options: RevalidateOptions = {}) => {
    const configValue = mergedConfig();
    const activeFetcher = (fetcher ?? configValue.fetcher) as BareFetcher<Data> | null | undefined;

    const [serializedKey, rawKey] = serialize(key as RawKey | (() => RawKey));
    currentKey.value = { rawKey, serializedKey };

    if (!serializedKey) {
      isLoading.value = false;
      isValidating.value = false;
      return undefined;
    }

    const cached = client.getState<Data, Error>(serializedKey);
    if (cached) {
      applyState();
    }

    if (!activeFetcher) {
      scheduleRefresh();
      return cached?.data;
    }

    if (!options.force) {
      if (!configValue.refreshWhenHidden && !isDocumentVisible()) {
        scheduleRefresh();
        return cached?.data;
      }

      if (!configValue.refreshWhenOffline && !isNavigatorOnline()) {
        scheduleRefresh();
        return cached?.data;
      }
    }

    const now = Date.now();
    const currentFetch =
      options.dedupe === false
        ? undefined
        : client.getFetch(serializedKey, now, configValue.dedupingInterval);

    const startedAt = currentFetch?.startedAt ?? now;

    if (!currentFetch) {
      client.setState<Data, Error>(
        serializedKey,
        {
          data: cached?.data,
          error: cached?.error,
          isLoading: cached?.data === undefined,
          isValidating: true,
        },
        configValue.ttl,
        rawKey,
      );
      applyState();

      const preloaded = client.consumePreload<Data>(serializedKey);
      const fetchPromise = preloaded ?? callFetcher(activeFetcher, rawKey);

      client.startFetch(serializedKey, fetchPromise, startedAt, configValue.dedupingInterval);
    }

    try {
      const fetchRecord = client.getFetch(serializedKey, Date.now(), configValue.dedupingInterval);

      const resolvedData = await (fetchRecord?.promise as Promise<Data>);

      if (!client.isLatestFetch(serializedKey, startedAt)) {
        return client.getState<Data, Error>(serializedKey)?.data;
      }

      const mutation = client.getMutation(serializedKey);
      if (mutation && mutation[0] > startedAt) {
        return client.getState<Data, Error>(serializedKey)?.data;
      }

      const latestData = client.getState<Data, Error>(serializedKey)?.data;
      client.setState<Data, Error>(
        serializedKey,
        {
          data: configValue.compare(latestData, resolvedData) ? latestData : resolvedData,
          error: undefined,
          isLoading: false,
          isValidating: false,
        },
        configValue.ttl,
        rawKey,
      );
      applyState();
      scheduleRefresh();
      return resolvedData;
    } catch (caught) {
      const resolvedError = caught as Error;

      client.setState<Data, Error>(
        serializedKey,
        {
          error: resolvedError,
          isLoading: false,
          isValidating: false,
        },
        configValue.ttl,
        rawKey,
      );
      applyState();

      const shouldRetry = resolveRetryableError(configValue.shouldRetryOnError, resolvedError);
      const shouldScheduleRetry =
        shouldRetry &&
        (options.retryCount ?? 0) < configValue.errorRetryCount &&
        !disposed &&
        (!configValue.revalidateOnFocus || !configValue.revalidateOnReconnect || isActive());

      if (shouldScheduleRetry) {
        clearRetryTimer();
        retryTimer = setTimeout(() => {
          void revalidate({
            dedupe: true,
            retryCount: (options.retryCount ?? 0) + 1,
          });
        }, configValue.errorRetryInterval);
      }

      if (options.throwOnError) {
        throw resolvedError;
      }

      scheduleRefresh();
      return cached?.data;
    }
  };

  const bindCurrentKey = (event: string, options?: RevalidateEventOptions) => {
    const configValue = mergedConfig();
    if (event === "focus") {
      if (!configValue.revalidateOnFocus) {
        return undefined;
      }

      const now = Date.now();
      if (!isActive() || now <= nextFocusRevalidatedAt) {
        return undefined;
      }

      nextFocusRevalidatedAt = now + configValue.focusThrottleInterval;
    }

    if (event === "reconnect" && (!configValue.revalidateOnReconnect || !isActive())) {
      return undefined;
    }

    if (event === "mutate") {
      const shouldRevalidate =
        typeof options?.revalidate === "function"
          ? options.revalidate(data.value, currentKey.value.rawKey)
          : options?.revalidate !== false;

      if (!shouldRevalidate) {
        applyState();
        scheduleRefresh();
        return undefined;
      }
    }

    return revalidate({
      dedupe: options?.dedupe ?? event !== "mutate",
      force: options?.force ?? event === "mutate",
      throwOnError: options?.throwOnError,
    });
  };

  const resetSubscriptions = () => {
    unsubscribeCache();
    unsubscribeRevalidator();
    unsubscribeCache = () => {};
    unsubscribeRevalidator = () => {};
  };

  watch(
    () => serialize(key as RawKey | (() => RawKey)),
    async ([serializedKey, rawKey]) => {
      clearTimers();
      resetSubscriptions();

      const isInitialActivation = !hasMounted;
      const configValue = mergedConfig();
      const fallbackData = resolveFallbackData(serializedKey, configValue);
      currentKey.value = { rawKey, serializedKey };

      if (!serializedKey) {
        nextFocusRevalidatedAt = 0;
        if (!configValue.keepPreviousData) {
          data.value = fallbackData;
          error.value = undefined;
        }
        isLoading.value = false;
        isValidating.value = false;
        hasMounted = true;
        return;
      }

      unsubscribeCache = client.subscribe(serializedKey, () => {
        applyState();
      });
      unsubscribeRevalidator = client.addRevalidator(serializedKey, bindCurrentKey);

      const cached = client.getState<Data, Error>(serializedKey);
      const resolvedData = resolveResolvedData(cached?.data, fallbackData);
      if (cached) {
        applyState();
      } else if (!configValue.keepPreviousData) {
        data.value = fallbackData;
        error.value = undefined;
        isLoading.value = false;
        isValidating.value = false;
      }

      nextFocusRevalidatedAt = configValue.revalidateOnFocus
        ? Date.now() + configValue.focusThrottleInterval
        : 0;

      if (
        shouldRevalidateOnActivation(
          isInitialActivation,
          resolvedData,
          Boolean(fetcher ?? configValue.fetcher),
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
    mutate: async (value, options) =>
      (await scopedMutate<Data>(
        currentKey.value.rawKey,
        value as Data | Promise<Data | undefined> | undefined,
        options as boolean | MutatorOptions<Data>,
      )) as Data | undefined,
  } as SWRVResponse<Data, Error>;
}
