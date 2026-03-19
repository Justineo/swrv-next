# Final SWR alignment task list

Date: 2026-03-20

## Summary

Completed the final implementation-alignment pass against local SWR 2.4.1.

## Closed tasks

- Trimmed the pre-release public surface:
  - removed extra helper exports from the root and `_internal` barrels
  - kept public hook aliases tied to the actual exported hook functions
- Finished argument and middleware alignment:
  - kept the `resolve-args` plus `normalize` structure
  - removed `false` as a normalized fetcher form
- Aligned runtime defaults with SWR:
  - switched compare to `dequal/lite`
  - switched online state to event-backed tracking
  - switched retry scheduling to exponential backoff
  - added slow-connection timeout defaults
- Aligned base-hook and infinite mount semantics:
  - added the cached-error initial-mount guard
  - added infinite `revalidateOnMount` page refetch behavior
- Aligned mutation and subscription public semantics:
  - mutation callback keys are serialized strings
  - mutation fetcher generic order now matches SWR
  - subscription pushes now accept mutator callbacks
- Simplified internal organization:
  - centralized internal key prefixes
  - reduced `immutable` to a thin middleware wrapper

## Remaining intentional drift

- Vue reactive `KeySource`
- `Ref`-based response objects
- explicit `SWRVClient` and provider-state storage
- provide/inject config flow
- provider-scoped `initFocus` and `initReconnect` listener ownership over an inherited cache object
- explicit snapshot SSR helpers
- deferred React-only Suspense, RSC, and dependency-collection machinery

## Validation

- `vp run swrv#check -- --fix`
- `vp test packages/swrv/tests`
- `vp run swrv#build`
- `vp exec playwright test`
- `vp pm pack -- --json --dry-run` in `packages/swrv`
- `vp run build -r`
- `vp check` still reports formatting drift in the user-edited
  `packages/site/docs/.vitepress/theme/index.css`, which this pass intentionally did not modify
