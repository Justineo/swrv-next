import { serialize } from "../_internal/utils/serialize";

import type { RawKey } from "../_internal/types";

export function unstable_serialize(key: RawKey | (() => RawKey)): string {
  return serialize(key)[0];
}
