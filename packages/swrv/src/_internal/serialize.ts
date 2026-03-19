import { isRef, unref } from "vue";

import { stableHash } from "./hash";

import type { BareFetcher, FetcherResponse, KeySource, RawKey } from "./types";

export function resolveKeyValue<Key extends RawKey>(key: KeySource<Key>): Key {
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

export function serialize<Key extends RawKey>(key: KeySource<Key>): [string, Key] {
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
  return Promise.resolve(invokeFetcher(fetcher, args));
}

export function invokeFetcher<Data>(
  fetcher: BareFetcher<Data>,
  args: RawKey,
): FetcherResponse<Data> {
  try {
    if (Array.isArray(args)) {
      return fetcher(...args);
    }

    return fetcher(args);
  } catch (error) {
    return Promise.reject(error) as Promise<Data>;
  }
}
