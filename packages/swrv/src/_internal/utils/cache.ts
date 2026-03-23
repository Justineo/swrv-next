import type { CacheAdapter } from "../types";

export function createCache<Value = unknown>(): CacheAdapter<Value> {
  return new Map<string, Value>();
}
