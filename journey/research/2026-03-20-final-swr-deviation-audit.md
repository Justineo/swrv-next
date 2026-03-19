# Final SWR deviation audit

Date: 2026-03-20
Status: completed

## Scope

Compare `packages/swrv/src` against local SWR 2.4.1 source at
`/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src` and classify every current deviation
across:

- module organization
- type interfaces
- runtime logic

This pass closes every remaining deviation that is both:

- clearly not required by Vue semantics
- safe to change before first public release

## Final deviation inventory

### Module organization

| Area                             | SWR                                               | SWRV Next                                                              | Status      | Decision                                   |
| -------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| Base hook entry helper           | `_internal/utils/resolve-args.ts` owns `withArgs` | `_internal/resolve-args.ts` owns `withArgs`                            | resolved    | aligned                                    |
| Argument normalizer naming       | `normalize` in `normalize-args.ts`                | `normalize` in `normalize-args.ts`                                     | resolved    | aligned                                    |
| Base hook file split             | `index/use-swr.ts` plus `index/serialize.ts`      | `index/use-swrv.ts`, `index/use-swrv-handler.ts`, `index/serialize.ts` | intentional | keep the Vue-specific entry/runtime split  |
| Global runtime storage           | cache-global tuple utilities                      | explicit `SWRVClient`, `provider-state.ts`, `cache-helper.ts`          | intentional | keep explicit provider-scoped client model |
| Internal key prefixes            | `_internal/constants.ts` owns feature prefixes    | `_internal/constants.ts` now owns infinite and subscription prefixes   | resolved    | aligned                                    |
| Immutable wrapper shape          | thin `withMiddleware(useSWR, immutable)` wrapper  | thin `withMiddleware(useSWRV, immutable)` wrapper                      | resolved    | aligned                                    |
| Temporary compatibility wrappers | none                                              | already removed                                                        | resolved    | aligned                                    |

### Type interfaces

| Area                           | SWR                                               | SWRV Next                                                                 | Status      | Decision                                                               |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| Key model                      | `Key` and `Arguments`                             | `RawKey` plus reactive `KeySource`                                        | intentional | keep Vue-native reactive key source split                              |
| Response model                 | plain values plus dependency collection           | Vue `Ref`s                                                                | intentional | keep Vue-native response contract                                      |
| Public base hook alias         | `SWRHook = typeof useSWR`                         | `SWRVHook = typeof useSWRV`                                               | resolved    | aligned                                                                |
| Public infinite hook alias     | `SWRInfiniteHook = typeof useSWRInfinite`         | `SWRVInfiniteHook = typeof useSWRVInfinite`                               | resolved    | aligned                                                                |
| Public mutation hook alias     | `SWRMutationHook = typeof useSWRMutation`         | `SWRVMutationHook = typeof useSWRVMutation`                               | resolved    | aligned                                                                |
| Public subscription hook alias | `SWRSubscriptionHook = typeof useSWRSubscription` | `SWRVSubscriptionHook = typeof useSWRVSubscription`                       | resolved    | aligned                                                                |
| Mutation callback key type     | serialized string key                             | serialized string key                                                     | resolved    | aligned                                                                |
| Mutation fetcher generic order | `Data, Key, ExtraArg`                             | `Data, Key, ExtraArg`                                                     | resolved    | aligned                                                                |
| Subscription push typing       | data or mutator callback                          | data or mutator callback                                                  | resolved    | aligned                                                                |
| Public root helper exports     | SWR avoids leaking internal state shape           | `CacheState` leak removed; root no longer exports it                      | resolved    | aligned                                                                |
| Provider config surface        | no explicit client type on user config            | `client`, `cache`, `provider`, `initFocus`, `initReconnect` remain public | intentional | keep explicit client and cache control for Vue SSR and provider scopes |

### Runtime logic

| Area                            | SWR                                                                                   | SWRV Next                                                                                     | Status      | Decision                           |
| ------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| Default compare                 | deep equality via `dequal/lite`                                                       | deep equality via `dequal/lite`                                                               | resolved    | aligned                            |
| Default retry scheduling        | exponential backoff with optional retry cap                                           | exponential backoff with optional retry cap                                                   | resolved    | aligned                            |
| Slow-connection defaults        | longer retry and loading timeouts                                                     | longer retry and loading timeouts                                                             | resolved    | aligned                            |
| Online detection                | event-tracked `online` flag, not raw `navigator.onLine`                               | event-tracked `online` flag                                                                   | resolved    | aligned                            |
| Focus initializer               | `visibilitychange` and `focus` listeners without visibility filtering in the listener | same                                                                                          | resolved    | aligned                            |
| Cached-error mount guard        | second consumer mount with cached error skips eager revalidation                      | same                                                                                          | resolved    | aligned                            |
| Infinite `revalidateOnMount`    | cached pages refetch on mount when enabled                                            | same                                                                                          | resolved    | aligned                            |
| Fetcher normalization           | `null` and config-only normalization, not `false`                                     | same                                                                                          | resolved    | aligned                            |
| Mutation callback key semantics | callbacks receive serialized key                                                      | same                                                                                          | resolved    | aligned                            |
| Provider reuse of parent cache  | reusing the parent provider does not create a fresh boundary                          | returning the parent cache now reuses the parent client instead of creating a shadow boundary | resolved    | aligned                            |
| Subscription updater semantics  | updater functions mutate cached state, not fallback-only displayed state              | updater functions are now forwarded through the bound mutator unchanged                       | resolved    | aligned                            |
| State subscription model        | `useSyncExternalStore` plus dependency collection                                     | cache listeners feeding Vue refs directly                                                     | intentional | keep Vue-native subscription model |
| SSR handoff                     | fallback and React server integration                                                 | explicit snapshot serialization and hydration helpers                                         | intentional | keep explicit Vue SSR primitives   |
| Suspense and RSC                | native React implementation                                                           | deferred                                                                                      | deferred    | not part of this pass              |

## Closed task list

1. Trimmed pre-release-only public and `_internal` exports that did not match the intended final
   surface.
2. Removed `false` as a normalized fetcher form.
3. Renamed helper organization to match SWR's `resolve-args` and `normalize` shape.
4. Aligned default compare, retry scheduling, slow-connection timings, and online detection with
   SWR.
5. Aligned base-hook mount behavior with SWR's cached-error guard.
6. Aligned infinite mount revalidation semantics with SWR.
7. Aligned mutation and subscription type surfaces with SWR where React-specific behavior was not
   involved.
8. Reused the parent client when `provider` returns the parent cache and added symmetric coverage
   for real child-provider boundaries.
9. Centralized internal key-prefix constants and simplified the immutable wrapper to match SWR's
   thinner structure.

## Remaining intentional deviations

- Vue reactive `KeySource`
- `Ref`-based `SWRVResponse`
- explicit `SWRVClient` and provider-state storage
- provide/inject config flow instead of React rerender-driven context propagation
- explicit snapshot SSR helpers
- deferred React-only Suspense, RSC, and dependency-collection machinery

## Final conclusion

There are no remaining non-React, non-Vue-required deviations that can still be removed safely in
this prerelease line. The remaining differences are structural consequences of Vue's reactive and
provider model, or explicitly deferred React-only surface area.
