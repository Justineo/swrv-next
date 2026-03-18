# Guide

## Goals

SWRV Next is designed around three constraints:

- align with SWR behavior where it improves predictability and migration
- stay idiomatic for Vue users by returning refs and fitting naturally into `setup()`
- keep cache domains explicit so SSR and multi-app boundaries are safe

## Install

```bash
vp add swrv vue
```

## Basic Usage

```ts
import useSWRV from "swrv";

const { data, error, isLoading, isValidating, mutate } = useSWRV("/api/user", async (key) => {
  const response = await fetch(key);
  if (!response.ok) {
    throw new Error("Failed to load the current user.");
  }
  return response.json();
});
```

Returned values are Vue refs, so templates can read them directly and script code should use `.value`.

## Scoped Configuration

Use `SWRVConfig` to create a cache boundary or to override global behavior:

```ts
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
```

```vue
<SWRVConfig :value="{ client, dedupingInterval: 1500 }">
  <App />
</SWRVConfig>
```

Use `SWRVConfig` whenever you need an explicit cache domain, custom provider behavior, or per-app request isolation.

## Fallback Data

`fallbackData` remains available per hook:

```ts
const { data } = useSWRV("/api/user", fetchUser, {
  fallbackData: { id: "loading", name: "Loading..." },
});
```

For app-level or SSR-style initial data, prefer config-level `fallback` on
`SWRVConfig`:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const fallback = {
  "/api/user": { id: "1", name: "Ada" },
};
</script>

<template>
  <SWRVConfig :value="{ fallback }">
    <App />
  </SWRVConfig>
</template>
```

Fallback values are returned immediately when the cache is empty, but they do
not populate the cache entry themselves. If revalidation runs on mount, the
fallback value stays visible until the request resolves.

## Preload

```ts
import { preload } from "swrv";

await preload("/api/user", async () => {
  const response = await fetch("/api/user");
  return response.json();
});
```

`preload()` also accepts tuple and function keys, dedupes repeated preloads for
the same serialized key, and is consumed by `useSWRVInfinite` when you preload
page keys ahead of time.

## Mutation

```ts
import { mutate } from "swrv";

await mutate("/api/user", updateUser(), {
  optimisticData: (current) => ({ ...current, name: "Optimistic" }),
  rollbackOnError: true,
});
```

For imperative remote writes with dedicated `isMutating` state, use `useSWRVMutation` from `swrv/mutation`.

## Infinite Loading

```ts
import useSWRVInfinite from "swrv/infinite";

const swrv = useSWRVInfinite(
  (index) => ["/api/projects", index] as const,
  async (path, index) => {
    const response = await fetch(`${path}?page=${index}`);
    return response.json();
  },
  { initialSize: 2 },
);
```

See the examples page for cursor-based pagination, subscription setup, and mutation-hook usage.

For SSR and per-request cache boundaries, see the dedicated SSR guide.
