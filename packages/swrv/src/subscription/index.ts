import { watch } from "vue";

import { useSWRVConfig } from "../config";
import { resolveKeyValue, serialize } from "../_internal/serialize";
import { type HookWithArgs, withMiddleware } from "../_internal/with-middleware";
import useSWRV from "../index/use-swrv";
import { getSubscriptionStorage } from "./state";

import type { KeySource, RawKey, SWRVConfiguration, SWRVMiddleware } from "../_internal/types";
import type { SWRVSubscription, SWRVSubscriptionHook, SWRVSubscriptionResponse } from "./types";

export const SUBSCRIPTION_PREFIX = "$sub$";

export function createSubscriptionCacheKey(serializedKey: string): string {
  return `${SUBSCRIPTION_PREFIX}${serializedKey}`;
}

export const subscription = function subscription(useSWRVNext: HookWithArgs): SWRVSubscriptionHook {
  return function useSWRVSubscription<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
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
};

const useSWRVSubscriptionBase = withMiddleware(
  useSWRV as HookWithArgs,
  subscription as unknown as SWRVMiddleware,
) as unknown as SWRVSubscriptionHook;

export default function useSWRVSubscription<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(
  key: KeySource<Key>,
  subscribe: SWRVSubscription<Data, Error, Key>,
  config: SWRVConfiguration<Data, Error> = {},
): SWRVSubscriptionResponse<Data, Error> {
  return useSWRVSubscriptionBase(key, subscribe, config);
}

export type {
  SWRVSubscription,
  SWRVSubscriptionHook,
  SWRVSubscriptionOptions,
  SWRVSubscriptionResponse,
} from "./types";
