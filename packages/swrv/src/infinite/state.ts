import { getOrCreateScopedValue } from "../_internal/scoped-storage";

import type { SWRVInfiniteRevalidationState } from "./types";

const sizeStorage = new WeakMap<object, Map<string, number>>();
const revalidationStorage = new WeakMap<
  object,
  Map<string, SWRVInfiniteRevalidationState<unknown>>
>();

export function getInfiniteSizeStore(storageKey: object): Map<string, number> {
  return getOrCreateScopedValue(sizeStorage, storageKey, () => new Map<string, number>());
}

export function getInfiniteRevalidationStore<Data = unknown>(
  storageKey: object,
): Map<string, SWRVInfiniteRevalidationState<Data>> {
  return getOrCreateScopedValue(revalidationStorage, storageKey, () => {
    return new Map<string, SWRVInfiniteRevalidationState<unknown>>();
  }) as Map<string, SWRVInfiniteRevalidationState<Data>>;
}
