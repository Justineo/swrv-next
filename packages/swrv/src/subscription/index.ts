import { watch } from "vue";

import { useSWRVConfig } from "../config";
import { withMiddleware } from "../_internal";
import useSWRV from "../use-swrv";
import { resolveKeyValue, serialize } from "../_internal/serialize";

import type {
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVHook,
  SWRVMiddleware,
} from "../_internal/types";

const SUBSCRIPTION_PREFIX = "$sub$";

type SubscriptionStorage = [Map<string, number>, Map<string, () => void>];

const subscriptionStorage = new WeakMap<object, SubscriptionStorage>();

export interface SWRVSubscriptionOptions<Data = unknown, Error = unknown> {
  next: (error?: Error | null, data?: Data) => void;
}

export type SWRVSubscription<Data = unknown, Error = unknown, Key extends RawKey = RawKey> = (
  key: Exclude<Key, null | undefined | false>,
  options: SWRVSubscriptionOptions<Data, Error>,
) => () => void;

export interface SWRVSubscriptionResponse<Data = unknown, Error = unknown> {
  data: ReturnType<typeof useSWRV<Data, Error>>["data"];
  error: ReturnType<typeof useSWRV<Data, Error>>["error"];
}

const subscription = (<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  useSWRVNext: SWRVHook,
) =>
  (
    key: KeySource<Key>,
    subscribe: SWRVSubscription<Data, Error, Key>,
    config: SWRVConfiguration<Data, Error> = {},
  ): SWRVSubscriptionResponse<Data, Error> => {
    const { client } = useSWRVConfig();
    const storageKey = client.cache as object;

    if (!subscriptionStorage.has(storageKey)) {
      subscriptionStorage.set(storageKey, [new Map(), new Map()]);
    }

    const [subscriptions, disposers] = subscriptionStorage.get(storageKey)!;

    const swrv = useSWRVNext(
      (() => {
        const [serializedKey] = serialize(key as KeySource<Key>);
        return serializedKey ? `${SUBSCRIPTION_PREFIX}${serializedKey}` : null;
      }) as KeySource<RawKey>,
      null,
      {
        ...config,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      },
    );

    watch(
      () => serialize(key as KeySource<Key>)[0],
      (serializedKey, _previous, onCleanup) => {
        if (!serializedKey) {
          return;
        }

        const resolvedKey = resolveKeyValue(key as KeySource<Key>);
        const subscriptionKey = `${SUBSCRIPTION_PREFIX}${serializedKey}`;
        const currentCount = subscriptions.get(subscriptionKey) ?? 0;

        subscriptions.set(subscriptionKey, currentCount + 1);

        if (!currentCount) {
          const dispose = subscribe(resolvedKey as Exclude<Key, null | undefined | false>, {
            next: (subscriptionError, subscriptionData) => {
              if (subscriptionError !== null && subscriptionError !== undefined) {
                client.setState<Data, Error>(
                  subscriptionKey,
                  {
                    error: subscriptionError,
                    isLoading: false,
                    isValidating: false,
                  },
                  0,
                  resolvedKey,
                );
                return;
              }

              void swrv.mutate(subscriptionData as Data, false);
            },
          });

          if (typeof dispose !== "function") {
            throw new Error("The `subscribe` function must return a function to unsubscribe.");
          }

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
  }) as unknown as SWRVMiddleware;

const useSWRVSubscriptionWithMiddleware = withMiddleware(useSWRV, subscription);

export default function useSWRVSubscription<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(
  key: KeySource<Key>,
  subscribe: SWRVSubscription<Data, Error, Key>,
  config: SWRVConfiguration<Data, Error> = {},
): SWRVSubscriptionResponse<Data, Error> {
  return useSWRVSubscriptionWithMiddleware(
    key as never,
    subscribe as never,
    config as never,
  ) as unknown as SWRVSubscriptionResponse<Data, Error>;
}
