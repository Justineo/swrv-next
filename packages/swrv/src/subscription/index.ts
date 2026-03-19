import { watch } from "vue";

import { useSWRVConfig } from "../config";
import { applyFeatureMiddleware } from "../_internal";
import { createSubscriptionCacheKey } from "../_internal/key-prefix";
import { resolveMiddlewareStack } from "../_internal/middleware-stack";
import { resolveKeyValue, serialize } from "../_internal/serialize";
import { getSubscriptionStorage } from "../_internal/subscription-state";
import { useSWRVHandler } from "../use-swrv-handler";
import { useSWRVContext } from "../config";

import type {
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVHook,
  SWRVResponse,
} from "../_internal/types";

export interface SWRVSubscriptionOptions<Data = unknown, Error = unknown> {
  next: (error?: Error | null, data?: Data) => void;
}

export type SWRVSubscription<Data = unknown, Error = unknown, Key extends RawKey = RawKey> = (
  key: Exclude<Key, null | undefined | false>,
  options: SWRVSubscriptionOptions<Data, Error>,
) => () => void;

export interface SWRVSubscriptionResponse<Data = unknown, Error = unknown> {
  data: SWRVResponse<Data, Error>["data"];
  error: SWRVResponse<Data, Error>["error"];
}

type SWRVSubscriptionHook = <Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  key: KeySource<Key>,
  subscribe: SWRVSubscription<Data, Error, Key>,
  config?: SWRVConfiguration<Data, Error>,
) => SWRVSubscriptionResponse<Data, Error>;

function createSubscriptionHook(useSWRVNext: SWRVHook): SWRVSubscriptionHook {
  return function useSWRVSubscriptionHook<
    Data = unknown,
    Error = unknown,
    Key extends RawKey = RawKey,
  >(
    key: KeySource<Key>,
    subscribe: SWRVSubscription<Data, Error, Key>,
    config: SWRVConfiguration<Data, Error> = {},
  ): SWRVSubscriptionResponse<Data, Error> {
    const { client } = useSWRVConfig();
    const storageKey = client.cache as object;
    const [subscriptions, disposers] = getSubscriptionStorage(storageKey);

    const swrv = useSWRVNext(
      (() => {
        const [serializedKey] = serialize(key as KeySource<Key>);
        return serializedKey ? createSubscriptionCacheKey(serializedKey) : null;
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
        const subscriptionKey = createSubscriptionCacheKey(serializedKey);
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
  };
}

export default function useSWRVSubscription<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(
  key: KeySource<Key>,
  subscribe: SWRVSubscription<Data, Error, Key>,
  config: SWRVConfiguration<Data, Error> = {},
): SWRVSubscriptionResponse<Data, Error> {
  const context = useSWRVContext();
  const middlewares = resolveMiddlewareStack(context.config.value, config);
  const runSubscription = applyFeatureMiddleware(
    createSubscriptionHook(useSWRVHandler),
    middlewares,
  );

  return runSubscription(key, subscribe, config);
}
