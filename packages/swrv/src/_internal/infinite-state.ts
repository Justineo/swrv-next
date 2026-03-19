import { getOrCreateScopedValue } from "./scoped-storage";

import type { RawKey } from "./types";

const sizeStorage = new WeakMap<object, Map<string, number>>();
const revalidationStorage = new WeakMap<object, Map<string, InfiniteRevalidationState<any>>>();

export interface InfiniteRevalidationState<Data = unknown> {
  revalidate?: boolean | InfiniteRevalidateFn<Data>;
  revalidateAll?: boolean;
}

export interface InfiniteRevalidateFn<Data = unknown> {
  (data: Data | undefined, key: RawKey): boolean;
}

export function getInfiniteSizeStore(storageKey: object): Map<string, number> {
  return getOrCreateScopedValue(sizeStorage, storageKey, () => new Map<string, number>());
}

export function getInfiniteRevalidationStore(
  storageKey: object,
): Map<string, InfiniteRevalidationState<any>> {
  return getOrCreateScopedValue(revalidationStorage, storageKey, () => {
    return new Map<string, InfiniteRevalidationState<any>>();
  });
}
