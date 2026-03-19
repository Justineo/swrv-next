---
title: Migrate from v1
description: Move an existing SWRV v1 codebase to the rebuilt 2.x line.
---

# Migrate from v1

SWRV 2 is a rewrite, not an incremental patch over the legacy line. Treat the migration as a move
to a new runtime model rather than a minor dependency bump.

## What changed structurally

- the repo is now a modern monorepo with separate library and site packages
- cache state is scoped through `SWRVConfig` boundaries instead of leaning on one implicit global
  cache
- the public surface follows SWR’s capability groups more closely: base hook, immutable, infinite,
  mutation, and subscription
- types, tests, packaging checks, and release automation are first-class project scope

## Main API changes

- `SWRVConfig` is now the center of shared fetchers, fallback data, middleware, and cache boundaries
- `fallback` and snapshot hydration replace older ad hoc SSR handoff patterns
- `useSWRVInfinite`, `useSWRVMutation`, and `useSWRVSubscription` are first-class maintained entry
  points
- `ttl` is removed from the rebuilt core API
- `serverTTL` is not part of the rebuilt core API

## Common replacements

| v1 pattern                         | v2 direction                                    |
| ---------------------------------- | ----------------------------------------------- |
| global singleton cache assumptions | explicit `SWRVConfig` boundaries                |
| direct cache writes                | `mutate`, scoped `mutate`, or `useSWRVMutation` |
| bespoke pagination flows           | `useSWRVInfinite`                               |
| server-prefetch-only initial state | `fallback` or snapshot hydration                |
| `serverTTL`-driven SSR behavior    | explicit Vue SSR handoff                        |

## Migration checklist

1. Add a root `SWRVConfig` boundary.
2. Move shared fetcher logic into that boundary.
3. Replace direct cache writes with `mutate` or `useSWRVMutation`.
4. Replace legacy pagination flows with `useSWRVInfinite`.
5. Move SSR initial data to `fallback` or snapshot hydration.
6. Replace any `ttl`-based expiry assumptions with explicit invalidation, mutation, or a custom
   provider cache if expiring storage is still required.
7. Re-check custom cache access code and switch to `useSWRVConfig()` where needed.

## Migrate by concern, not by page

For larger apps, it is usually safer to migrate one concern at a time:

### 1. Cache boundaries

Start by wrapping the app, route subtree, or embedded widget in `SWRVConfig`:

```vue
<script setup lang="ts">
import { SWRVConfig, createSWRVClient } from "swrv";

const value = {
  client: createSWRVClient(),
  fetcher: (url: string) => fetch(url).then((response) => response.json()),
};
</script>

<template>
  <SWRVConfig :value="value">
    <App />
  </SWRVConfig>
</template>
```

### 2. Reads

Most basic `useSWRV` calls can migrate directly, but check:

- key shape
- shared fetcher location
- SSR expectations
- any assumptions about immediate server fetching

### 3. Writes

Move imperative update paths to `mutate` or `useSWRVMutation`.

### 4. Pagination and live data

Replace bespoke paginated cache management with `useSWRVInfinite`, and move push-based sources to
`useSWRVSubscription`.

## Things to re-check during migration

- tuple fetchers are positional in SWRV 2, so confirm helper signatures when moving shared
  fetchers
- SSR hooks no longer start network requests on the server
- custom provider or cache code should be tested inside the new scoped client model
- old tests that depended on one global cache should be updated to create a fresh client per test

## Rollout advice

If the codebase is large, migrate by boundary instead of by route. Start with one `SWRVConfig`
boundary, move shared fetcher logic there, then convert mutation, pagination, and SSR handoff area
by area. That keeps the migration legible and makes it easier to verify behavior against the new
runtime.
