export const INFINITE_PREFIX = "$inf$";
export const SUBSCRIPTION_PREFIX = "$sub$";

const INTERNAL_KEY_PREFIX_PATTERN = /^\$(inf|sub)\$/;

export function isInternalCacheKey(key: string): boolean {
  return INTERNAL_KEY_PREFIX_PATTERN.test(key);
}

export function createInfiniteCacheKey(serializedKey: string): string {
  return `${INFINITE_PREFIX}${serializedKey}`;
}

export function createSubscriptionCacheKey(serializedKey: string): string {
  return `${SUBSCRIPTION_PREFIX}${serializedKey}`;
}
