import { INFINITE_PREFIX } from "../_internal/constants";
import { serialize } from "../_internal/serialize";

import type { RawKey } from "../_internal/types";
import type { SWRVInfiniteKeyLoader } from "./types";

export function getFirstPageKey<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
): string {
  try {
    return serialize(getKey(0, null))[0];
  } catch {
    return "";
  }
}

export function unstable_serialize<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
): string {
  const serializedKey = getFirstPageKey(getKey);
  return serializedKey ? INFINITE_PREFIX + serializedKey : "";
}
