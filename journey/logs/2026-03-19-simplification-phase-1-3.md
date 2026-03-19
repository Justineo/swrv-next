# SWRV Simplification Phase 1-3 Log

## 2026-03-19

- Re-read the design snapshot, roadmap, remaining-work plan, and simplification plan before refactoring.
- Validated the main risk before refactoring provider state: custom `initFocus` and `initReconnect` can live on top of an inherited cache, so event ownership cannot be collapsed onto raw cache identity without changing behavior.
- Completed the safe structural extraction phase:
  - extracted web defaults and DOM event initializers into `_internal/web-preset.ts`
  - extracted provider-scoped fetch, mutation, preload, listener, and revalidator maps into `_internal/provider-state.ts`
  - extracted cache read and write behavior into `_internal/cache-helper.ts`
  - centralized the internal `$inf$` and `$sub$` prefixes in `_internal/key-prefix.ts`
- Refactored `createSWRVClient()` into a thin facade over the new helpers instead of keeping all runtime responsibilities inside `client.ts`.
- Simplified `preload` and filtered `mutate` to consume the shared helpers rather than reaching into ad hoc client internals.
- Split the base hook into:
  - a thin public `use-swrv.ts` entry module for overloads, arg normalization, and middleware composition
  - a dedicated `use-swrv-handler.ts` runtime module for activation, revalidation, cache sync, and lifecycle behavior
- Reused the new key-prefix helpers in `infinite` and `subscription`.
- Added a shared `_internal/scoped-storage.ts` helper so base-hook warnings and advanced API side stores no longer repeat their own WeakMap initialization logic.
- Split config responsibilities further:
  - `config.ts` is now a thin public facade
  - `config-context.ts` now owns provider setup and public context access
  - `config-utils.ts` now owns config merge and client-resolution helpers
- Collapsed stable scoped helper identity caches into provider state, so `getScopedMutator()` and `getScopedPreload()` no longer maintain separate module-level `WeakMap` stores.
- Extracted advanced API side stores into shared modules:
  - `_internal/infinite-state.ts`
  - `_internal/subscription-state.ts`
- Isolated optional paths from the base hook entry:
  - `_internal/middleware-stack.ts` now resolves devtools plus config middleware
  - `_internal/server-prefetch-warning.ts` now owns SSR missing-prefetch warning state and emission
- Ran three explicit review rounds after the refactor:
  - round 1 checked for remaining repeated state stores and helper caches
  - round 2 compared the remaining advanced modules with SWR's structure and did not find a higher-value simplification than the current shape
  - round 3 validated packaging and the full ready pipeline, and did not reveal additional safe structural work
- Revalidated the workspace with `vp test` and `vp check`.
- Revalidated the broader release path with `vp run ready` and `vp pm pack -- --json --dry-run`.
- Phase 1 through Phase 5 of the simplification plan are now complete for the current scope.
