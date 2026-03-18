# Current Scope

## What Is Already In Place

- provider-scoped cache clients and explicit cache boundaries
- core `useSWRV` with refs for `data`, `error`, `isLoading`, and `isValidating`
- global and bound `mutate`
- global `preload`
- dedicated `immutable`, `infinite`, `mutation`, `subscription`, and `_internal` entry points
- behavior coverage for dedupe, revalidation triggers, optimistic mutation, infinite loading, subscription lifecycle, and package exports
- public compile-time coverage for root and subpath APIs

## What Is Intentionally Vue-Native

- hook state is returned as Vue refs instead of React state snapshots
- configuration is typically provided through `SWRVConfig`
- provider boundaries are explicit and map naturally to Vue app and SSR boundaries
- the composition model assumes `setup()` or an active effect scope

## Current Differences From SWR

The project is aligned to SWR as the main behavioral reference, but it is not yet a complete drop-in parity release.

- the supported SSR path is explicit client scoping plus config-level `fallback`, not a larger framework integration layer yet
- some advanced `infinite` and `mutation` edge semantics still need broader ported coverage
- the current docs focus on the working public surface, not the full final API contract

## Current Differences From Legacy SWRV

- cache domains are client-scoped instead of being only module-level singletons
- package layout follows SWR-style subpath exports
- the repo uses Vite+, Vitest, VitePress, and modern release automation instead of Vue CLI and Jest-era tooling
- typings are being rebuilt around stricter public inference and declaration coverage

## What To Expect Next

- more SWR behavior-test ports
- deeper Nuxt and hydration guidance beyond the current explicit-client path
- richer docs examples and migration notes
- publishability checks beyond static workflow scaffolding
