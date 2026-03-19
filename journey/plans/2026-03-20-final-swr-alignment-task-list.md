# Final SWR alignment task list

Date: 2026-03-20
Status: completed

## Goal

Run one last implementation-focused audit against local SWR 2.4.1, turn every remaining
non-Vue-specific deviation into a concrete task list, and close all safe pre-release tasks in one
pass.

## Task list

### T1. Trim extra public surface

- Remove accidental or provisional exports that do not belong on the final public surface.
- Prefer public hook aliases based on `typeof use...` over weaker helper-only hook aliases.

Status: completed

### T2. Finish argument and middleware alignment

- Keep the SWR-shaped `resolve-args` plus `normalize` flow.
- Remove the extra `false` fetcher normalization path.
- Keep middleware composition aligned with SWR's wrapper model.

Status: completed

### T3. Align runtime defaults

- Switch default compare to `dequal/lite`.
- Switch online tracking to the SWR-style event-backed flag.
- Switch retry scheduling to SWR-style exponential backoff.
- Apply slow-connection timeout defaults.

Status: completed

### T4. Align base-hook mount semantics

- Add the cached-error mount guard so additional consumers do not immediately revalidate a cached
  error state.

Status: completed

### T5. Align infinite mount semantics

- Make `revalidateOnMount: true` refetch cached pages on mount for `useSWRVInfinite`.

Status: completed

### T6. Align mutation and subscription public types

- Use serialized string keys for mutation callbacks.
- Align mutation fetcher generic order with SWR.
- Widen subscription push typing to accept mutator callbacks.

Status: completed

### T7. Simplify organization where SWR is thinner

- Keep internal prefix constants in one place.
- Keep `immutable` as a thin wrapper instead of duplicating the base-hook overload surface.

Status: completed

## Remaining intentional deviations

- Vue reactive `KeySource`
- `Ref`-based response objects
- explicit `SWRVClient` and provider-state storage
- provide/inject config flow
- provider-scoped `initFocus` and `initReconnect` listener ownership over an inherited cache object
- explicit snapshot SSR helpers
- deferred React-only Suspense, RSC, and dependency-collection machinery

## Validation target

- `vp run swrv#check -- --fix`
- `vp test packages/swrv/tests`
- `vp run swrv#build`
- `vp exec playwright test`
- `vp pm pack -- --json --dry-run` in `packages/swrv`
- `vp run build -r`
