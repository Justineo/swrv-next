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
- Revalidated the workspace with `vp test` and `vp check`.
- Phase 1, Phase 2, and Phase 3 of the simplification plan are now complete.
