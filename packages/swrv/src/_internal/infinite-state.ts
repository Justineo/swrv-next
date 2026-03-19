import { getOrCreateScopedValue } from "./scoped-storage";

import type { RawKey } from "./types";

const sizeStorage = new WeakMap<object, Map<string, number>>();
const revalidationStorage = new WeakMap<object, Map<string, InfiniteRevalidationState<unknown>>>();

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

export function getInfiniteRevalidationStore<Data = unknown>(
  storageKey: object,
): Map<string, InfiniteRevalidationState<Data>> {
  return getOrCreateScopedValue(revalidationStorage, storageKey, () => {
    return new Map<string, InfiniteRevalidationState<unknown>>();
  }) as Map<string, InfiniteRevalidationState<Data>>;
}
