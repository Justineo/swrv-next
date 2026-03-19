const INTERNAL_KEY_PREFIX_PATTERN = /^\$(inf|sub)\$/;

export function isInternalCacheKey(key: string): boolean {
  return INTERNAL_KEY_PREFIX_PATTERN.test(key);
}
