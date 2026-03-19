# Server rendering and hydration

The rebuilt SWRV SSR story is explicit: server rendering reads provided data, but does not silently start network requests from hooks.

## Hooks do not fetch on the server

During server rendering:

- `useSWRV` reads `fallbackData`
- `useSWRV` reads config `fallback`
- `useSWRV` reads hydrated snapshots
- hooks do not start fetches

That keeps request ownership explicit and avoids accidental server-side waterfalls.

## Use config fallback for initial data

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

## Serialize and hydrate a snapshot

```ts
import { createSWRVClient, hydrateSWRVSnapshot, serializeSWRVSnapshot } from "swrv";
```

On the server:

```ts
const client = createSWRVClient();
const snapshot = serializeSWRVSnapshot(client);
```

On the client:

```ts
const client = hydrateSWRVSnapshot(createSWRVClient(), snapshot);
```

Pass the hydrated client through `SWRVConfig`.

## Strict warnings for missing handoff data

If you want a warning when a server-rendered hook reaches a key without fallback or snapshot data, enable `strictServerPrefetchWarning`.

## What is deferred

This lane intentionally does not add a first-party Nuxt module or a suspense-based SSR story.
