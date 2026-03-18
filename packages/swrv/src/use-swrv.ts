import { getCurrentScope, onScopeDispose, ref, watch } from "vue";

import { mergeConfiguration, useSWRVContext } from "./config";
import { createScopedMutator } from "./_internal/mutate";
import { callFetcher, resolveKeyValue, serialize } from "./_internal/serialize";

import type {
  BareFetcher,
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

function resolveRetryableError<ErrorType = unknown>(
  option: boolean | ((error: ErrorType) => boolean),
  error: ErrorType,
) {
  return typeof option === "function" ? option(error) : option !== false;
}

export function unstable_serialize(key: RawKey | (() => RawKey)) {
  return serialize(key)[0];
}

function shouldUseMountRevalidation(
  hasCachedValue: boolean,
  config: ResolvedSWRVConfiguration<any, any>,
) {
  if (config.revalidateOnMount !== undefined) {
    return config.revalidateOnMount;
  }

  return !hasCachedValue || config.revalidateIfStale;
}

export default function useSWRV<Data = unknown, Error = unknown>(
  key: RawKey | (() => RawKey),
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: RawKey | (() => RawKey),
  fetcher: BareFetcher<Data> | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: RawKey | (() => RawKey),
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
  let lastFocusAt = 0;

  const clearTimers = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = undefined;
    }

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  const applyState = () => {
    const entry = currentKey.value.serializedKey
      ? client.getState<Data, Error>(currentKey.value.serializedKey)
      : undefined;

    if (!entry) {
      return;
    }

    data.value = entry.data;
    error.value = entry.error;
    isLoading.value = entry.isLoading;
    isValidating.value = entry.isValidating;
  };

  const scheduleRefresh = () => {
    clearTimers();

    const configValue = mergedConfig();
    const interval =
      typeof configValue.refreshInterval === "function"
        ? configValue.refreshInterval(data.value)
        : configValue.refreshInterval;

    if (!interval || !currentKey.value.serializedKey) {
      return;
    }

    refreshTimer = setTimeout(() => {
      void revalidate({ dedupe: false });
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
      if (
        !configValue.refreshWhenHidden &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        scheduleRefresh();
        return cached?.data;
      }

      if (
        !configValue.refreshWhenOffline &&
        typeof navigator !== "undefined" &&
        navigator.onLine === false
      ) {
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

      client.setState<Data, Error>(
        serializedKey,
        {
          data: resolvedData,
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
      if (shouldRetry && (options.retryCount ?? 0) < configValue.errorRetryCount && !disposed) {
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
      if (now - lastFocusAt < configValue.focusThrottleInterval) {
        return undefined;
      }

      lastFocusAt = now;
    }

    if (event === "reconnect" && !configValue.revalidateOnReconnect) {
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

      const configValue = mergedConfig();
      currentKey.value = { rawKey, serializedKey };

      if (!serializedKey) {
        if (!configValue.keepPreviousData) {
          data.value = configValue.fallbackData;
          error.value = undefined;
        }
        isLoading.value = false;
        isValidating.value = false;
        return;
      }

      unsubscribeCache = client.subscribe(serializedKey, () => {
        applyState();
      });
      unsubscribeRevalidator = client.addRevalidator(serializedKey, bindCurrentKey);

      const cached = client.getState<Data, Error>(serializedKey);
      if (cached) {
        applyState();
      } else if (!configValue.keepPreviousData) {
        data.value = configValue.fallbackData;
        error.value = undefined;
        isLoading.value = false;
        isValidating.value = false;
      }

      if (shouldUseMountRevalidation(Boolean(cached), configValue)) {
        await revalidate({
          dedupe: true,
          force: !cached,
        });
        return;
      }

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
