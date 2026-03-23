import { INFINITE_PREFIX } from "../_internal/constants";
import { serialize } from "../_internal/utils/serialize";

import type { RawKey } from "../_internal/types";
import type { SWRVInfiniteKeyLoader } from "./types";

export function getFirstPageKey<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
): string {
  try {
    return serialize(getKey ? getKey(0, null) : null)[0];
  } catch {
    return "";
  }
}

export function unstable_serialize<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
): string {
  return INFINITE_PREFIX + getFirstPageKey(getKey);
}
