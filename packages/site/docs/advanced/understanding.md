---
title: Understanding SWRV
description: Understand how SWRV state changes over time.
---

# Understanding SWRV

`useSWRV` returns four primary state refs:

- `data`
- `error`
- `isLoading`
- `isValidating`

They change independently depending on the request state.

## State machine

`useSWRV` returns `data`, `error`, `isLoading`, and `isValidating` depending on the state of the
fetcher. The diagrams in the SWR docs map to the same state transitions in SWRV, even though the
returned values are Vue refs instead of plain React state.

### Fetch and revalidate

On the first request with no cached data:

| Phase        | `data`        | `error`     | `isLoading` | `isValidating` |
| ------------ | ------------- | ----------- | ----------- | -------------- |
| first render | `undefined`   | `undefined` | `true`      | `true`         |
| success      | resolved data | `undefined` | `false`     | `false`        |

Later revalidations keep `data` in place while `isValidating` flips back to `true`.

### Key change

When the key changes, SWRV resolves the new key, reads any cached or fallback data for it, and then
decides whether the new key should revalidate.

### Key change + previous data

When `keepPreviousData` is enabled, SWRV can keep the previous key’s data visible while the new key
loads.

### Fallback

When `fallbackData` or config-level `fallback` exists, the hook can render with that data
immediately before any revalidation finishes.

### Key change + fallback

If the new key has fallback data, SWRV switches directly to that fallback value instead of dropping
to `undefined`.

### Key change + previous data + fallback

When both features are enabled, SWRV chooses the most useful value for the current transition:

- current-key fallback when it exists
- otherwise previous data if `keepPreviousData` is enabled
- otherwise `undefined`

## Combining `isLoading` and `isValidating` for better UX

`isValidating` becomes `true` whenever there is an in-flight request, whether or not there is data
already.

`isLoading` is narrower. It becomes `true` only when there is an in-flight request and no loaded
data for the active key yet.

This is a useful split for UI design:

- use `isLoading` for the initial empty-state skeleton
- use `isValidating` for subtle background refresh indicators

> [!NOTE]
> Fallback data and previous data are not considered "loaded data". That means you can have
> something to render while `isLoading` is still `true`.

```vue
<script setup lang="ts">
const { data, isLoading, isValidating } = useSWRV(STOCK_API, fetcher, {
  refreshInterval: 3000,
});
</script>

<template>
  <StockSkeleton v-if="isLoading" />
  <template v-else>
    <div>{{ data }}</div>
    <Spinner v-if="isValidating" />
  </template>
</template>
```

## Return previous data for better UX

`keepPreviousData` is especially useful for search and filter UIs where the key changes frequently:

```vue
<script setup lang="ts">
import { ref } from "vue";
import useSWRV from "swrv";

const search = ref("");

const response = useSWRV(() => `/api/search?q=${encodeURIComponent(search.value)}`, fetcher, {
  keepPreviousData: true,
});
</script>

<template>
  <input v-model="search" placeholder="Search..." />

  <div :class="{ loading: response.isLoading }">
    <ProductCard
      v-for="product in response.data?.products ?? []"
      :key="product.id"
      :product="product"
    />
  </div>
</template>
```

With that option enabled, the list does not briefly collapse to an empty state on every key change.

## Dependency collection for performance

SWR’s React docs talk about dependency collection as a render optimization.

SWRV does not port that exact mechanism because Vue already tracks reads at the ref level. Since
`data`, `error`, `isLoading`, and `isValidating` are separate refs, Vue naturally tracks which
parts of the SWRV response your template or computed values actually use.

For a deeper discussion of what still matters for performance in Vue, see
[Performance](/advanced/performance#dependency-collection).
