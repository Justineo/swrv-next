---
title: Prefetching
description: Prefetch data with preload, fallback, and SSR handoff.
---

# Prefetching

There are many ways to prefetch data for SWRV. For top-level requests, browser-native preload is a
great default, and SWRV also provides a dedicated `preload` API when you want to start requests
programmatically.

## Top-level page data

If the browser already knows which request is coming next, you can use native preload hints:

```html
<link rel="preload" href="/api/user" as="fetch" crossorigin="anonymous" />
```

Put it inside your document `<head>`. It is simple, fast, and native.

The browser can start fetching the resource before JavaScript has even hydrated your Vue app. Any
later request for the same URL can then reuse that work, including SWRV requests.

## Programmatically prefetch

SWRV provides `preload` so you can start a request before the hook needs it. `preload` accepts a
`key` and a `fetcher`, just like `useSWRV`.

You can call `preload` outside of Vue setup on the client:

```ts
import { preload } from "swrv";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

void preload("/api/user", fetcher);
```

Then the first matching hook can reuse that request:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const { data } = useSWRV("/api/user", fetcher);
</script>
```

Within the component tree, `preload` is also useful in event handlers or watchers:

```vue
<script setup lang="ts">
import { watch } from "vue";
import { preload } from "swrv";

const props = defineProps<{ userId: string }>();

watch(
  () => props.userId,
  (userId) => {
    void preload(`/api/user/${userId}`, fetcher);
  },
  { immediate: true },
);

function warmNextUser(nextUserId: string) {
  void preload(`/api/user/${nextUserId}`, fetcher);
}
</script>

<template>
  <button @mouseenter="warmNextUser('2')">Preview next user</button>
</template>
```

This is especially helpful for avoiding waterfalls in routes or flows where you already know which
request is likely to happen next.

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

See [API](/api#options) for hook-level `fallbackData` and [Global configuration](/global-configuration)
for provider-level `fallback`.

## Prefetch on the server

SWR’s React docs also cover React Server Components. SWRV does not have that promise handoff model.
Its server story is explicit instead:

- `preload()` is a client-side helper and is a no-op on the server
- server rendering should use config `fallback` or snapshot hydration
- `strictServerPrefetchWarning` can help you find keys that render on the server without handoff
  data

See [Server rendering and hydration](/server-rendering-and-hydration) for the full SSR and
hydration pattern.
