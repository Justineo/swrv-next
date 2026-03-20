# SWRV

SWRV is a Vue-native stale-while-revalidate data fetching library aligned with
the modern SWR behavior model.

## Release Track

This rewrite is intended to ship as the next major line of SWRV. Until the
first stable cut is tagged, prerelease publishes stay on the `next` dist-tag.

## Support Matrix

- Vue: `>=3.2.26 <4`
- TypeScript: `>=5.5` for the typed consumer path and contributor baseline
- Node.js: `>=22.12.0` for repository development and CI

## Compatibility Notes

- The supported SSR contract is explicit `client` scoping plus config-level
  `fallback`.
- `serverTTL` is intentionally not returning as part of the rebuilt core API.

## Install

```bash
vp add swrv
```

## Basic Usage

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const { data, error, isLoading, isValidating, mutate } = useSWRV("/api/user", async (key) => {
  const response = await fetch(key);
  if (!response.ok) {
    throw new Error("Failed to load the current user.");
  }

  return response.json();
});
</script>
```

Call `useSWRV` inside `setup()` or `<script setup>`. `data`, `error`,
`isLoading`, and `isValidating` are Vue refs.

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
vp run test:e2e
vp run build -r
vp run release:verify
```

The docs site lives in `packages/site`. For project strategy and migration
context, see the repository docs and journey records.
