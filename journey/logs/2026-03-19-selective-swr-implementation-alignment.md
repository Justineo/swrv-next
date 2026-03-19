# Selective SWR implementation alignment

Date: 2026-03-19
Status: completed

## Summary

Implemented the selective runtime-alignment plan so SWRV now follows SWR's implementation shape more
closely without importing React-specific mechanics.

## Completed work

- Added a shared SWR-shaped entry pipeline:
  - `_internal/normalize-args.ts`
  - `_internal/with-args.ts`
  - `_internal/with-middleware.ts`
- Moved the base-hook family into an `index/` layout:
  - `src/index/index.ts`
  - `src/index/use-swrv.ts`
  - `src/index/use-swrv-handler.ts`
  - `src/index/serialize.ts`
  - retained thin top-level forwarding files for `use-swrv.ts` and `use-swrv-handler.ts`
- Removed the older ad hoc entry helpers:
  - deleted `_internal/normalize.ts`
  - deleted `_internal/middleware-stack.ts`
- Aligned advanced APIs with SWR's wrapper pattern:
  - `immutable`, `infinite`, `mutation`, and `subscription` now all compose through
    `withMiddleware(useSWRV, feature)`
- Localized feature-specific ownership:
  - `infinite/types.ts`
  - `infinite/state.ts`
  - `infinite/serialize.ts`
  - `mutation/types.ts`
  - `subscription/types.ts`
  - `subscription/state.ts`
- Removed feature-only generic internals:
  - deleted `_internal/infinite-state.ts`
  - deleted `_internal/subscription-state.ts`
- Simplified `_internal/key-prefix.ts` so it now only serves the generic mutate-path internal-key
  filter
- Tightened the package-export smoke test to resolve emitted files relative to `package.json`
  instead of the test file path

## Validation

- `vp run swrv#check -- --fix`
- `vp test packages/swrv/tests`
- `vp run swrv#build`
- `vp exec playwright test`
- `vp run build -r`
- `vp pm pack -- --json --dry-run` in `packages/swrv`

## Remaining intentional drift

- `SWRVClient` remains as an explicit provider-bound facade because it still fits Vue/SSR better
  than a direct tuple-style global-state encoding
- Vue-native refs, watchers, provide/inject context, and SSR handoff helpers remain intentionally
  different from SWR's React-specific runtime
