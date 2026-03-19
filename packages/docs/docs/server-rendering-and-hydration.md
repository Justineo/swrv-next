---
title: Server rendering and hydration
description: Use SWRV with Vue SSR and explicit hydration handoff.
---

# Server rendering and hydration

SWRV’s SSR model is explicit: hooks can read prefetched data on the server, but they do not start
network requests automatically during server rendering.

## Hooks do not fetch on the server

During server rendering:

- `useSWRV` can read `fallbackData`
- `useSWRV` can read config-level `fallback`
- `useSWRV` can read hydrated snapshots
- hooks do not start new fetches

This keeps request ownership explicit and avoids accidental server-side waterfalls.

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

## Pre-rendering with default data

If you already have the data on the server, pass it through `fallback`:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const user = { id: "1", name: "Ada" };

const value = {
  fallback: {
    "/api/user": user,
  },
};
</script>

<template>
  <SWRVConfig :value="value">
    <App />
  </SWRVConfig>
</template>
```

The hook reads that data during SSR and then resumes normal client-side revalidation after
hydration.

### Complex keys

When the key is not a simple string, use `unstable_serialize`:

```ts
import { unstable_serialize } from "swrv";

const key = ["/api/projects", { page: 1, status: "open" }] as const;

const value = {
  fallback: {
    [unstable_serialize(key)]: await fetchProjects(),
  },
};
```

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
