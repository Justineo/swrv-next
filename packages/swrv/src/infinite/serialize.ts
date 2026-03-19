import { INFINITE_PREFIX } from "../_internal/constants";
import { serialize } from "../_internal/serialize";

import type { RawKey } from "../_internal/types";
import type { SWRVInfiniteKeyLoader } from "./types";

export function createInfiniteCacheKey(serializedKey: string): string {
  return `${INFINITE_PREFIX}${serializedKey}`;
}

function serializePage<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
  index: number,
  previousPageData: Data | null,
): [string, RawKey] {
  try {
    return serialize(getKey(index, previousPageData));
  } catch {
    return ["", null];
  }
}

export function getInfinitePage<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
  index: number,
  previousPageData: Data | null,
): [string, RawKey] {
  return serializePage(getKey, index, previousPageData);
}

export function unstable_serialize<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
): string {
  const [serializedKey] = serializePage(getKey, 0, null);
  return serializedKey ? createInfiniteCacheKey(serializedKey) : "";
}
