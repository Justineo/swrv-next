# V1 migration guide

Date: 2026-03-24
Status: complete

## Summary

Expanded the docs migration story for users on `swrv@1` into a concrete upgrade guide and made the
guide more discoverable from the main docs entry points.

## What changed

- rewrote `packages/site/docs/migrate-from-v1.md` as a step-by-step migration guide instead of a
  short conceptual overview
- added a v1-to-v2 API comparison table covering:
  - provider-scoped config and cache boundaries
  - `mutate` semantic changes
  - `preload` replacing `mutate(key, promise)` prefetching
  - removal of `ttl`, `serverTTL`, `revalidateDebounce`, `SWRVCache`, and built-in cache adapter
    paths
  - explicit SSR fallback and snapshot hydration
- added concrete migration steps for shared config, reads, writes, pagination, live data, cache
  persistence, SSR, and tests
- added migration callouts to `Getting started` and `API`
- moved migration higher in the docs sidebar and shortened the top-nav label to `Migration`
- followed up on the guide wording so `SWRVConfig` is presented as optional in the main migration
  path; the default root context remains a valid baseline when no wrapper is needed
- trimmed the guide further toward a compatibility-first version switch:
  - the main migration path now focuses on `mutate`, removed v1-only APIs/imports, and SSR only
    when applicable
  - `SWRVConfig`, `useSWRVMutation`, `useSWRVInfinite`, and `useSWRVSubscription` now live under
    explicit optional follow-up work instead of the core dependency-switch path
- trimmed it again so the page now lists only required migration items; optional and additive SWRV
  2 feature adoption is removed from the migration guide entirely
- adjusted docs navigation so migration no longer appears in the top nav and instead lives in its
  own sidebar `Migration` section
- restructured the migration guide around only three breaking-change buckets:
  - `mutate`
  - removed or renamed config/cache APIs
  - SSR handoff
- expanded each breaking-change section with a more explicit migration path instead of a short note
- removed the install/version-bump section from the migration guide so the page only covers code
  changes required after the dependency switch
- refined the guide again from first principles:
  - replaced numbered `migration path 1/2/3/4` wording with simple reader questions and intent-based
    decision flow
  - expanded the `mutate` section to explain the semantic difference between prefetch,
    revalidation, and cache writes
  - rewrote the removed-config and SSR sections to explain why the old signatures/options changed,
    not just what to rename them to

## Validation

- `vp install`
- `vp test`
- `vp check`
- `vp run build -r`
