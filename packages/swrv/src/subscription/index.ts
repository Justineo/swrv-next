import { watch } from "vue";

import { useSWRVConfig } from "../_internal/utils/config-context";
import { resolveKeyValue, serialize } from "../_internal/utils/serialize";
import { type HookWithArgs, withMiddleware } from "../_internal/utils/with-middleware";
import useSWRV from "../index/use-swr";

import type { KeySource, MutatorCallback, RawKey, SWRVConfiguration } from "../_internal/types";
import type {
  InternalSWRVSubscriptionHook,
  SWRVSubscription,
  SWRVSubscriptionResponse,
} from "./types";

type SubscriptionStorage = [Map<string, number>, Map<string, () => void>];
const subscriptionStorage = new WeakMap<object, SubscriptionStorage>();
const SUBSCRIPTION_PREFIX = "$sub$";

function getSubscriptionStorage(storageKey: object): SubscriptionStorage {
  const current = subscriptionStorage.get(storageKey);
  if (current) {
    return current;
  }

  const next: SubscriptionStorage = [new Map(), new Map()];
  subscriptionStorage.set(storageKey, next);
  return next;
}

export const subscription = function subscription(
  useSWRVNext: HookWithArgs,
): InternalSWRVSubscriptionHook {
  return function useSWRVSubscription<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
    key: KeySource<Key>,
    subscribe: SWRVSubscription<Data, Error, Key>,
    config: SWRVConfiguration<Data, Error> = {},
  ): SWRVSubscriptionResponse<Data, Error> {
    const { client } = useSWRVConfig();
    const storageKey = client.cache as object;
    const [subscriptions, disposers] = getSubscriptionStorage(storageKey);
    const getSubscriptionKey = (serializedKey: string) => SUBSCRIPTION_PREFIX + serializedKey;

    const swrv = useSWRVNext(
      (() => {
        const [serializedKey] = serialize(key as KeySource<Key>);
        return serializedKey ? getSubscriptionKey(serializedKey) : null;
      }) as KeySource<RawKey>,
      null,
      config,
    );

    watch(
      () => serialize(key as KeySource<Key>)[0],
      (serializedKey, _previous, onCleanup) => {
        if (!serializedKey) {
          return;
        }

        const resolvedKey = resolveKeyValue(key as KeySource<Key>);
        const subscriptionKey = getSubscriptionKey(serializedKey);
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

              void swrv.mutate(subscriptionData as Data | MutatorCallback<Data>, false);
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

const useSWRVSubscriptionBase = withMiddleware(useSWRV as HookWithArgs, subscription);

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

export type SWRVSubscriptionHook = typeof useSWRVSubscription;

export type {
  SWRSubscription,
  SWRSubscriptionHook,
  SWRSubscriptionOptions,
  SWRSubscriptionResponse,
  SWRVSubscription,
  SWRVSubscriptionOptions,
  SWRVSubscriptionResponse,
} from "./types";
