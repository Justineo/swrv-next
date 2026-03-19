---
title: Global configuration
description: Configure default options for all SWRV hooks.
---

# Global configuration

`SWRVConfig` provides shared configuration for every SWRV hook inside the boundary.

For the full option list, see [API](/api). This page focuses on how those options are shared across
cache boundaries and app subtrees.

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const value = {
  refreshInterval: 3000,
  fetcher: (url: string) => fetch(url).then((response) => response.json()),
};
</script>

<template>
  <SWRVConfig :value="value">
    <Dashboard />
  </SWRVConfig>
</template>
```

Inside `Dashboard`, any `useSWRV("/api/projects")` call can reuse that fetcher and polling policy.

## Nesting configurations

Nested `SWRVConfig` boundaries merge with the parent configuration.

### Object configuration example

```vue
<template>
  <SWRVConfig :value="{ dedupingInterval: 100, refreshInterval: 100, fallback: { a: 1, b: 1 } }">
    <SWRVConfig :value="{ dedupingInterval: 200, fallback: { a: 2, c: 2 } }">
      <Page />
    </SWRVConfig>
  </SWRVConfig>
</template>
```

The nested boundary resolves to:

```ts
{
  dedupingInterval: 200,
  refreshInterval: 100,
  fallback: { a: 2, b: 1, c: 2 },
}
```

Primitive values override. Mergeable objects such as `fallback` are merged.

### Functional configuration example

You can also derive the next configuration from the parent:

```ts
const value = (parent: ReturnType<typeof useSWRVConfig>["config"]) => ({
  ...parent,
  dedupingInterval: parent.dedupingInterval * 5,
});
```

This is useful when you want to preserve most of the parent settings but adjust a few values for a
local subtree.

## Extra APIs

### Cache provider

`SWRVConfig` can also define cache ownership:

- `client`: provide a full SWRV client
- `cache`: provide a specific cache instance
- `provider`: create or extend a cache provider from the parent cache

These options are useful when you need one cache per app, test, or SSR request.

See [Cache](/advanced/cache) for provider semantics and [Server rendering and hydration](/server-rendering-and-hydration)
for request-scoped SSR usage.

```vue
<script setup lang="ts">
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
</script>

<template>
  <SWRVConfig :value="{ client }">
    <App />
  </SWRVConfig>
</template>
```

### Access to global configurations

Use `useSWRVConfig()` inside `setup()` to access the active scoped helpers:

```ts
const { cache, client, config, mutate, preload } = useSWRVConfig();
```

This is the correct way to reach the active cache boundary. If a custom provider is in use, the
scoped `mutate` returned here stays aligned with that provider.

See [Mutation](/mutation) and [Prefetching](/prefetching) for how those scoped helpers are used in
practice.

## Middleware

Register middleware at the boundary with `value.use`:

```ts
const logger = (useSWRVNext) => (key, fetcher, config) => {
  console.log("swrv key", key);
  return useSWRVNext(key, fetcher, config);
};
```

```vue
<SWRVConfig :value="{ use: [logger] }">
  <App />
</SWRVConfig>
```

See [Middleware](/middleware) for the full middleware model.
