# Repository analysis

Date: 2026-03-21

## Summary

Started a repository-wide architecture and maintainability audit using
`journey/design.md` as context and the codebase as ground truth.

## Progress

- Read the canonical design snapshot.
- Ran `vp install` per project instructions.
- Confirmed the repo is clean and the expected monorepo shape is present.
- Started runtime and test-surface inspection for `packages/swrv` and docs
  structure inspection for `packages/site`.

## Findings

- The implemented architecture broadly matches the design snapshot:
  provider-scoped client state, a base `useSWRV` runtime, and advanced feature
  entrypoints layered on top.
- The largest remaining complexity hotspot is still
  `packages/swrv/src/index/use-swrv-handler.ts`, which centralizes activation,
  retries, polling, SSR behavior, focus or reconnect revalidation, and cache
  subscription concerns in one file.
- `packages/swrv/src/infinite/index.ts` remains the second major complexity
  hotspot because it owns a separate page-loading path instead of reusing more
  of the base-hook fetch lifecycle.
- `packages/swrv/src/config-context.ts` eagerly creates the default global
  client at module load, which means default browser event listeners are
  attached as an import side effect through `createSWRVClient()`.
- The middleware bridge in `packages/swrv/src/_internal/with-middleware.ts`
  keeps feature wrappers aligned with SWR's composition model, but it does so
  with type coercion and indirect control flow that is harder to trace than a
  direct feature wrapper.
- The docs site still carries a few implementation inconsistencies with the
  design snapshot and package metadata, especially external logo URLs and
  GitHub links that still point at `Kong/swrv`.

## Validation

- `vp check`
- `vp test`

Both commands passed during the audit (`221` tests across `24` test files).
