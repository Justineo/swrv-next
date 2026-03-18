import { isRef, unref } from "vue";

import { stableHash } from "./hash";

import type { BareFetcher, RawKey } from "./types";

export function resolveKeyValue<Key extends RawKey>(key: Key | (() => Key)): Key {
  if (typeof key === "function") {
    try {
      return (key as () => Key)();
    } catch {
      return "" as Key;
    }
  }

  if (isRef(key)) {
    return unref(key) as Key;
  }

  return key;
}

export function serialize(key: RawKey | (() => RawKey)): [string, RawKey] {
  const resolvedKey = resolveKeyValue(key);

  const args = resolvedKey;

  if (typeof resolvedKey === "string") {
    return [resolvedKey, args];
  }

  if (Array.isArray(resolvedKey)) {
    return [resolvedKey.length ? stableHash(resolvedKey) : "", args];
  }

  return resolvedKey ? [stableHash(resolvedKey), args] : ["", args];
}

export function callFetcher<Data>(fetcher: BareFetcher<Data>, args: RawKey): Promise<Data> {
  if (Array.isArray(args)) {
    return Promise.resolve(fetcher(...args));
  }

  return Promise.resolve(fetcher(args));
}
