---
title: Prefetching
description: Prefetch data with preload, fallback, and SSR handoff.
---

# Prefetching

SWRV supports both browser-native prefetching and explicit SWRV preloading.

## Top-level page data

If the browser already knows which request is coming next, you can use native preload hints:

```html
<link rel="preload" href="/api/user" as="fetch" crossorigin="anonymous" />
```

This helps the browser start the network work earlier, before Vue mounts the component tree.

## Programmatically prefetch

Use `preload` to start a request before the hook needs it:

```ts
import { preload } from "swrv";

await preload("/api/user", async (url) => {
  const response = await fetch(url);
  return response.json();
});
```

`preload`:

- accepts the same key shapes as `useSWRV`
- dedupes repeated preloads by serialized key
- clears failed preload entries so later attempts can retry
- hands the response to the first matching hook request

Tuple keys work too:

```ts
await preload(["/api/user", token] as const, async (url, authToken) => {
  return fetchWithToken(url, authToken);
});
```

## Pre-fill data

Use `fallbackData` when one hook needs placeholder data:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const user = useSWRV("/api/user", fetcher, {
  fallbackData: { id: "loading", name: "Loading" },
});
</script>
```

Use config-level `fallback` when you want to pre-fill data for a whole boundary:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const value = {
  fallback: {
    "/api/user": { id: "1", name: "Ada" },
  },
};
</script>

<template>
  <SWRVConfig :value="value">
    <App />
  </SWRVConfig>
</template>
```

See [API](/api#options) for the hook-level option surface and [Global configuration](/global-configuration)
for provider-level fallback setup.

## Prefetch on the server

Unlike SWR’s React Server Component examples, SWRV’s SSR story is explicit:

- `preload()` is a client-side helper and is a no-op on the server
- server rendering should use config `fallback` or snapshot hydration
- `strictServerPrefetchWarning` can help you find keys that render on the server without handoff
  data

See [Server rendering and hydration](/server-rendering-and-hydration) for the full SSR pattern.
