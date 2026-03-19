import { INFINITE_PREFIX, SUBSCRIPTION_PREFIX } from "./constants";

const INTERNAL_KEY_PREFIXES = [INFINITE_PREFIX, SUBSCRIPTION_PREFIX];

export function isInternalCacheKey(key: string): boolean {
  return INTERNAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}
