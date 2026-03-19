---
title: Performance
description: Optimize SWRV performance with deduplication, compare, and Vue-native state tracking.
---

# Performance

SWRV is built around the same performance goals as SWR:

- no unnecessary requests
- no unnecessary reactive churn
- no unnecessary code imported

SWRV's built-in caching and deduplication skip unnecessary network requests, but the performance of
the `useSWRV` composable itself still matters. In a complex app, there can be many SWRV calls in a
single page render.

## Deduplication

Hooks sharing the same key dedupe in-flight requests inside the same cache boundary.

That means repeated `useSWRV("/api/user", fetcher)` calls do not fan out into one request per
component.

For example:

```ts
import useSWRV from "swrv";

export function useUser() {
  return useSWRV("/api/user", fetcher);
}
```

```vue
<!-- Avatar.vue -->
<script setup lang="ts">
import { useUser } from "./use-user";

const { data, error } = useUser();
</script>

<template>
  <ErrorState v-if="error" />
  <Spinner v-else-if="!data" />
  <img v-else :src="data.avatar_url" />
</template>
```

```vue
<!-- App.vue -->
<template>
  <Avatar />
  <Avatar />
  <Avatar />
  <Avatar />
  <Avatar />
</template>
```

Even though there are five consumers, there is still only one request in flight for that key.

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

For example, these two components do not subscribe to the same reactive slices:

```vue
<script setup lang="ts">
const { data } = useSWRV("/api/user", fetcher);
</script>

<template>
  <UserCard v-if="data" :user="data" />
</template>
```

```vue
<script setup lang="ts">
const { data, isValidating } = useSWRV("/api/user", fetcher);
</script>

<template>
  <UserCard v-if="data" :user="data" />
  <Spinner v-if="isValidating" />
</template>
```

The first consumer only depends on `data`, while the second consumer depends on both `data` and
`isValidating`.

Performance work in SWRV should stay focused on:

- dedupe
- compare behavior
- stable keys
- cache boundary design
- avoiding unnecessary watch invalidation

## Tree shaking

The package is export-oriented and tree-shakeable. If you only import the core `useSWRV` API, the
companion APIs such as `swrv/infinite` are not pulled into the bundle unless you import them.
