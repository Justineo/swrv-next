# Migration

## From Legacy SWRV

The rebuild intentionally changes a few architectural defaults:

- cache domains are client-scoped instead of being only module singletons
- app-level initial data now fits naturally through config `fallback`
- the package layout mirrors SWR more closely with dedicated subpath exports
- mutation semantics support optimistic updates and explicit revalidation control
- the repo toolchain moves to Vite+, modern TypeScript, Vitest, and VitePress

## From SWR

The target behavioral model follows SWR, but Vue-native differences remain:

- `data`, `error`, `isLoading`, and `isValidating` are refs
- configuration is typically provided with `SWRVConfig`
- hooks are built for Composition API usage instead of React render cycles

## Status Notes

This repository is still in active rebuild mode. For the current public parity line and the main known gaps, use the published current-scope page.
