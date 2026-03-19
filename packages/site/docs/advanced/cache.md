---
title: Cache
description: Customize the cache provider and understand SWRV cache boundaries.
---

# Cache

SWRV uses a provider-scoped cache model. Each client owns its cache, listeners, dedupe records, and
preload records.

> [!WARNING]
> In most cases, you should not write to the cache directly. Prefer `mutate`, `useSWRVMutation`,
> `preload`, or config-level `fallback` so loading and listener behavior stays consistent.

## Cache provider

A cache provider is a Map-like object:

```ts
interface Cache<Data> {
  get(key: string): Data | undefined;
  set(key: string, value: Data): void;
  delete(key: string): void;
  keys(): IterableIterator<string>;
}
```

## Create cache provider

Use `provider`, `cache`, or `client` on `SWRVConfig` to define cache ownership:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const value = {
  provider: () => new Map(),
};
</script>

<template>
  <SWRVConfig :value="value">
    <Page />
  </SWRVConfig>
</template>
```

All SWRV hooks under that boundary use the same provider.

> [!WARNING]
> When the boundary is remounted, the provider is recreated too. Keep custom providers high enough
> in the app tree, or create them outside component setup, if the cache should survive remounts.

## Access current cache provider

Inside setup, use `useSWRVConfig()` to access the active scoped helpers:

```ts
const { cache, mutate } = useSWRVConfig();
```

If a custom provider is in use, this keeps you aligned with the current boundary.

> [!WARNING]
> If you use a custom cache boundary, the root global `mutate` helper is no longer the right tool
> for hooks inside that boundary. Use `useSWRVConfig().mutate` so the mutation targets the current
> provider.

## Experimental: extend cache provider

When multiple `SWRVConfig` boundaries are nested, `provider` receives the parent cache:

```ts
const value = {
  provider: (parentCache: Map<string, unknown>) => parentCache,
};
```

This makes it possible to wrap or extend the parent cache instead of replacing it outright.

## Examples

### LocalStorage based persistent cache

```ts
function localStorageProvider() {
  const map = new Map<string, unknown>(JSON.parse(localStorage.getItem("app-cache") ?? "[]"));

  window.addEventListener("beforeunload", () => {
    localStorage.setItem("app-cache", JSON.stringify(Array.from(map.entries())));
  });

  return map;
}
```

### Reset cache between test cases

In tests, create a fresh provider or client per test instead of sharing one global cache:

```ts
import { createSWRVClient } from "swrv";

const client = createSWRVClient();
```

Then provide that client through `SWRVConfig` for the test render.

### Modify the cache data

When you need to change cached data, prefer `mutate`:

```ts
const { mutate } = useSWRVConfig();

await mutate("/api/user", (current) => (current ? { ...current, name: "Grace" } : current));
```

You can also clear multiple keys through a filter:

```ts
const { mutate } = useSWRVConfig();

await mutate((key) => true, undefined, {
  revalidate: false,
});
```

That updates the cache while preserving SWRV’s normal mutation and listener semantics.
