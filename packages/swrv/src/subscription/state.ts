import { getOrCreateScopedValue } from "../_internal/scoped-storage";

type SubscriptionStorage = [Map<string, number>, Map<string, () => void>];

const subscriptionStorage = new WeakMap<object, SubscriptionStorage>();

export function getSubscriptionStorage(storageKey: object): SubscriptionStorage {
  return getOrCreateScopedValue(subscriptionStorage, storageKey, () => [new Map(), new Map()]);
}
