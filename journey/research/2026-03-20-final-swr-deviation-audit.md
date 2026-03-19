# SWR source drift audit

Date: 2026-03-20
Status: completed

## Scope

Compare local SWR 2.4.1 source at `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src`
against `packages/swrv/src`, focusing on:

- file and module layout
- helper and boundary ownership
- public and internal type-shape drift
- naming drift that still affects maintainability or parity

This pass does not treat "make Vue look like React" as the goal. The goal is to separate:

- remaining alignable drift
- intentional Vue-required drift

## Summary

Core runtime behavior is mostly aligned. The remaining safe drift is now concentrated in public
type aliases, helper ownership, and a few layout and naming boundaries.

## Remaining actionable drift

### 1. Exported hook aliases under-model the real callable surface

- `SWRVHook` in `packages/swrv/src/_internal/types.ts` only models `(key, fetcher?, config?)`
  instead of the real overload-rich `typeof useSWRV` surface.
- `SWRVInfiniteHook` in `packages/swrv/src/infinite/types.ts` misses the config-only form and
  weaker fetcher inference than the actual `useSWRVInfinite` export.
- `SWRVMutationHook` in `packages/swrv/src/mutation/types.ts` omits the real `throwOnError`
  overload precision from the default export.

Files:

- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/index/use-swrv.ts`
- `packages/swrv/src/infinite/types.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/mutation/types.ts`
- `packages/swrv/src/mutation/index.ts`

### 2. The root type barrel still exports SWRV-specific or internal-ish shapes

- Root exports still lean on `BoundMutator`, `CacheAdapter`, `CacheState`, `RawKey`, and
  `KeySource`.
- `CacheState` still exposes `_c` and `_k`, so the public surface leaks internal cache markers.
- SWR root instead exposes cleaner public aliases like `KeyedMutator`, `Cache`, `State`, `Key`,
  and `Arguments`.

Files:

- `packages/swrv/src/index.ts`
- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/_internal/index.ts`

### 3. `immutable` still duplicates the base-hook overload surface

- `packages/swrv/src/immutable/index.ts` still inlines nearly the full `useSWRV` overload set.
- SWR's `immutable` module stays a thin middleware wrapper over the base hook.

Files:

- `packages/swrv/src/immutable/index.ts`
- `packages/swrv/src/index/use-swrv.ts`
- `packages/swrv/src/_internal/types.ts`

### 4. Mutation type ownership still drifts from SWR

- `SWRVMutationConfiguration` types `onSuccess` and `onError` with raw key values instead of
  serialized string keys.
- The mutation runtime also calls those callbacks with `resolvedKey`, not the serialized key.
- `MutationFetcher` generic order is still `Data, ExtraArg, Key` instead of `Data, Key, ExtraArg`.

Files:

- `packages/swrv/src/mutation/types.ts`
- `packages/swrv/src/mutation/index.ts`

### 5. Subscription typing is narrower than both runtime behavior and SWR

- `SWRVSubscriptionOptions.next` only accepts data values.
- The runtime forwards subscription payloads through the bound mutator, so callback-style updates
  can work.
- SWR types already model `Data | MutatorCallback<Data>` there.

Files:

- `packages/swrv/src/subscription/types.ts`
- `packages/swrv/src/subscription/index.ts`

### 6. Preload ownership is still split across helper, middleware, and handler layers

- SWR keeps preload as both a public helper and a built-in middleware applied by `withArgs`.
- `swrv-next` currently keeps part of the behavior in `_internal/preload.ts`, part in
  `_internal/with-args.ts`, and part in `index/use-swrv-handler.ts`.

Files:

- `packages/swrv/src/_internal/preload.ts`
- `packages/swrv/src/_internal/with-args.ts`
- `packages/swrv/src/index/use-swrv-handler.ts`

### 7. Internal key-prefix ownership is still fragmented

- `INFINITE_PREFIX` lives in `infinite/serialize.ts`.
- `SUBSCRIPTION_PREFIX` lives in `subscription/index.ts`.
- generic mutate filtering relies on `_internal/key-prefix.ts` knowing both prefixes by regex.

Files:

- `packages/swrv/src/infinite/serialize.ts`
- `packages/swrv/src/subscription/index.ts`
- `packages/swrv/src/_internal/key-prefix.ts`

### 8. Low-priority layout drift remains

- `swrv-next` still uses top-level `src/index.ts` and `src/config.ts` instead of SWR's
  `src/index/index.ts` and `src/index/config.ts` layout.
- feature-local side stores remain split into `infinite/state.ts` and `subscription/state.ts`
  instead of staying inline beside the owning feature module.

Files:

- `packages/swrv/src/index.ts`
- `packages/swrv/src/config.ts`
- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/infinite/state.ts`
- `packages/swrv/src/subscription/index.ts`
- `packages/swrv/src/subscription/state.ts`

## Intentional Vue-required drift

These differences should remain unless the project deliberately stops being Vue-native:

- ref-based response objects, including `data`, `error`, `isLoading`, `isValidating`, mutation
  `isMutating`, and infinite `size`
- reactive key sources through `Ref`, `ComputedRef`, and function keys
- provide/inject config flow and effect-scope enforcement instead of React context and hook rules
- watcher-driven key, subscription, and infinite lifecycle control
- explicit snapshot serialization and hydration helpers instead of React server entrypoints

## Concrete swrv-next files implicated

- `packages/swrv/src/_internal/index.ts`
- `packages/swrv/src/_internal/key-prefix.ts`
- `packages/swrv/src/_internal/preload.ts`
- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/_internal/with-args.ts`
- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/config.ts`
- `packages/swrv/src/immutable/index.ts`
- `packages/swrv/src/index.ts`
- `packages/swrv/src/index/use-swrv-handler.ts`
- `packages/swrv/src/index/use-swrv.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/infinite/serialize.ts`
- `packages/swrv/src/infinite/state.ts`
- `packages/swrv/src/infinite/types.ts`
- `packages/swrv/src/mutation/index.ts`
- `packages/swrv/src/mutation/types.ts`
- `packages/swrv/src/subscription/index.ts`
- `packages/swrv/src/subscription/state.ts`
- `packages/swrv/src/subscription/types.ts`

## Conclusion

The remaining implementation drift is no longer feature-level. It is now mostly:

- public type alias precision
- helper and middleware ownership
- key-prefix and module-boundary cleanup
- a smaller set of naming and layout decisions

The intentional drift is still the Vue-native runtime contract itself.
