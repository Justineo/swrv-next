---
title: Performance
description: Optimize SWRV performance with deduplication, compare, and Vue-native state tracking.
---

# Performance

SWRV is built around the same performance goals as SWR:

- no unnecessary requests
- no unnecessary reactive churn
- no unnecessary code imported

## Deduplication

Hooks sharing the same key dedupe in-flight requests inside the same cache boundary.

That means repeated `useSWRV("/api/user", fetcher)` calls do not fan out into one request per
component.

There is also a `dedupingInterval` option when you need to tune the default window.

## Deep comparison

SWRV uses `compare` to preserve the current data identity when the next resolved value is
equivalent.

This matters because it helps reduce reactive churn in downstream computed values, watchers, and
components that consume the data ref.

You can override `compare` if your data contains fields such as timestamps that should be ignored in
equality checks.

## Dependency collection

SWR’s React implementation has a dependency-collection optimization that avoids updating state
slices a component never reads.

SWRV intentionally does not port that mechanism.

In Vue, `data`, `error`, `isLoading`, and `isValidating` are already separate refs, so Vue’s native
dependency tracking covers the important part of that performance model:

- a template that only reads `data` is not coupled to `error`
- a computed that only reads `isValidating` is not coupled to `data`
- the optimization happens through Vue reactivity, not through React-specific getter collection

Performance work in SWRV should stay focused on:

- dedupe
- compare behavior
- stable keys
- cache boundary design
- avoiding unnecessary watch invalidation

## Tree shaking

The package is export-oriented and tree-shakeable. If you only import the core `useSWRV` API, the
companion APIs such as `swrv/infinite` are not pulled into the bundle unless you import them.
