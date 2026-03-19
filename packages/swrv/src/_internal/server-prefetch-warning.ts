import { getOrCreateScopedValue } from "./scoped-storage";

const serverPrefetchWarnings = new WeakMap<object, Set<string>>();

export function warnMissingServerPrefetch(storageKey: object, serializedKey: string): void {
  const warnings = getOrCreateScopedValue(serverPrefetchWarnings, storageKey, () => new Set());
  if (warnings.has(serializedKey)) {
    return;
  }

  warnings.add(serializedKey);
  console.warn(
    `Missing pre-initiated data for serialized key "${serializedKey}" during server-side rendering. Data fetching should be initiated on the server and provided to SWRV via fallback data or a hydrated snapshot. You can set "strictServerPrefetchWarning: false" to disable this warning.`,
  );
}
