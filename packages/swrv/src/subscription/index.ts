import { watch } from "vue";

import { useSWRVConfig } from "../config";
import useSWRV from "../use-swrv";
import { resolveKeyValue, serialize } from "../_internal/serialize";

import type { RawKey } from "../_internal/types";

const SUBSCRIPTION_PREFIX = "$sub$";

type SubscriptionStorage = [Map<string, number>, Map<string, () => void>];

const subscriptionStorage = new WeakMap<object, SubscriptionStorage>();

export interface SWRVSubscriptionOptions<Data = unknown, Error = unknown> {
  next: (error?: Error | null, data?: Data) => void;
}

export type SWRVSubscription<Data = unknown, Error = unknown> = (
  key: RawKey,
  options: SWRVSubscriptionOptions<Data, Error>,
) => () => void;

export interface SWRVSubscriptionResponse<Data = unknown, Error = unknown> {
  data: ReturnType<typeof useSWRV<Data, Error>>["data"];
  error: ReturnType<typeof useSWRV<Data, Error>>["error"];
}

export default function useSWRVSubscription<Data = unknown, Error = unknown>(
  key: RawKey | (() => RawKey),
  subscribe: SWRVSubscription<Data, Error>,
): SWRVSubscriptionResponse<Data, Error> {
  const { client } = useSWRVConfig();
  const storageKey = client.cache as object;

  if (!subscriptionStorage.has(storageKey)) {
    subscriptionStorage.set(storageKey, [new Map(), new Map()]);
  }

  const [subscriptions, disposers] = subscriptionStorage.get(storageKey)!;

  const swrv = useSWRV<Data, Error>(
    () => {
      const [serializedKey] = serialize(key as RawKey | (() => RawKey));
      return serializedKey ? `${SUBSCRIPTION_PREFIX}${serializedKey}` : null;
    },
    undefined,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  watch(
    () => serialize(key as RawKey | (() => RawKey)),
    ([serializedKey], _previous, onCleanup) => {
      if (!serializedKey) {
        return;
      }

      const subscriptionKey = `${SUBSCRIPTION_PREFIX}${serializedKey}`;
      const resolvedKey = resolveKeyValue(key as RawKey | (() => RawKey));
      const currentCount = subscriptions.get(subscriptionKey) ?? 0;

      subscriptions.set(subscriptionKey, currentCount + 1);

      if (!currentCount) {
        const dispose = subscribe(resolvedKey, {
          next: (subscriptionError, subscriptionData) => {
            client.setState<Data, Error>(
              subscriptionKey,
              {
                data: subscriptionData,
                error: subscriptionError ?? undefined,
                isLoading: false,
                isValidating: false,
              },
              0,
              resolvedKey,
            );
          },
        });

        disposers.set(subscriptionKey, dispose);
      }

      onCleanup(() => {
        const nextCount = (subscriptions.get(subscriptionKey) ?? 1) - 1;
        if (nextCount <= 0) {
          subscriptions.delete(subscriptionKey);
          disposers.get(subscriptionKey)?.();
          disposers.delete(subscriptionKey);
          return;
        }

        subscriptions.set(subscriptionKey, nextCount);
      });
    },
    { immediate: true },
  );

  return {
    data: swrv.data,
    error: swrv.error,
  };
}
