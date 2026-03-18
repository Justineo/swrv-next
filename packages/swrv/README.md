# SWRV

SWRV is a Vue-native stale-while-revalidate data fetching library aligned with
the modern SWR behavior model.

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

`data`, `error`, `isLoading`, and `isValidating` are Vue refs.

## Provider and Fallback

Use `SWRVConfig` to scope cache state per app, per embedded widget, or per SSR
request. Config-level `fallback` values provide initial data for matching keys
without writing them into the cache.

```vue
<script setup lang="ts">
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
</script>

<template>
  <SWRVConfig :value="{ client, fallback: { '/api/user': { name: 'Ada' } } }">
    <App />
  </SWRVConfig>
</template>
```

For non-string keys, use `unstable_serialize()` to build the fallback map key.

## Entry Points

- `swrv`
- `swrv/immutable`
- `swrv/infinite`
- `swrv/mutation`
- `swrv/subscription`
- `swrv/_internal`

## Development

```bash
vp install
vp check
vp run test -r
vp run build -r
```

The docs site lives in `packages/docs`. For project strategy and migration
context, see the repository docs and journey records.
