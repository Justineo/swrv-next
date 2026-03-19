---
title: Server rendering and hydration
description: Use SWRV with Vue SSR and explicit hydration handoff.
---

# Server rendering and hydration

SWRV’s SSR model is explicit. Hooks can read prefetched data during server rendering, but they do
not start network requests automatically on the server.

## Client-side data fetching

If a page contains frequently updating data and does not need to be pre-rendered, no special SSR
setup is needed:

- render the page without data first
- fetch on the client
- keep the data fresh through SWRV's normal revalidation rules

This is a good fit for dashboards or other private pages where SEO is not the priority.

## Pre-rendering with default data

If the page must be pre-rendered, pass the prefetched data through `fallback` on `SWRVConfig`:

```ts
const article = await getArticleFromAPI();

const fallback = {
  "/api/article": article,
};
```

```vue
<!-- ServerPage.vue -->
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const props = defineProps<{
  fallback: Record<string, unknown>;
}>();
</script>

<template>
  <SWRVConfig :value="{ fallback: props.fallback }">
    <Article />
  </SWRVConfig>
</template>
```

```vue
<!-- Article.vue -->
<script setup lang="ts">
import useSWRV from "swrv";

const { data } = useSWRV("/api/article", fetcher);
</script>

<template>
  <h1>{{ data?.title }}</h1>
</template>
```

The page is still pre-rendered, but after hydration SWRV takes over again and can revalidate on the
client to keep the data fresh.

The important part is that the article is ready during SSR because it was prefetched explicitly, not
because the hook fetched on the server.

### Complex keys

If the key is not a simple string, serialize it for the `fallback` map:

```ts
import { unstable_serialize } from "swrv";

const key = ["/api/projects", { page: 1, status: "open" }] as const;

const fallback = {
  [unstable_serialize(key)]: await fetchProjects(),
};
```

## Hooks do not fetch on the server

During server rendering:

- `useSWRV` can read `fallbackData`
- `useSWRV` can read config-level `fallback`
- `useSWRV` can read hydrated snapshots
- hooks do not start new fetches

This keeps request ownership explicit and avoids accidental server-side waterfalls.

Unlike SWR’s React Server Component examples, there is no promise handoff mechanism for hook calls.
Server rendering in SWRV is based on prefilling data, then hydrating and revalidating on the
client.

## Request-scoped clients

Create one SWRV client per SSR request:

```ts
import { createSWRVClient } from "swrv";

export function createRequestContext() {
  return {
    swrv: createSWRVClient(),
  };
}
```

Then provide that client through `SWRVConfig` when you render the app.

## Snapshot hydration

If you want to pre-fill a full request-scoped client, serialize and hydrate a snapshot:

```ts
import { createSWRVClient, hydrateSWRVSnapshot, serializeSWRVSnapshot } from "swrv";

const serverClient = createSWRVClient();

// ...seed the client through mutate or other server-side preparation

const snapshot = serializeSWRVSnapshot(serverClient);
```

On the client:

```ts
const client = hydrateSWRVSnapshot(createSWRVClient(), snapshot);
```

Then provide that hydrated client through `SWRVConfig`.

## Client-side data fetching after hydration

After hydration, SWRV behaves the same way it does in a purely client-rendered app:

- cached data is available immediately
- revalidation follows the normal mount, focus, reconnect, and interval rules
- mutations and subscriptions stay scoped to the hydrated client boundary

## Strict warnings for missing handoff data

Enable `strictServerPrefetchWarning` when you want to find keys that are rendered on the server
without fallback or snapshot data:

```ts
const value = {
  strictServerPrefetchWarning: true,
};
```

This is especially useful while you are incrementally moving an SSR app toward an explicit data
handoff model.
