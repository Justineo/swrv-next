# SSR

## Current Supported Contract

SWRV's supported SSR path is intentionally explicit:

- create a fresh SWRV client per request
- provide that client with `SWRVConfig`
- pass request-specific initial data through config-level `fallback` or a serialized snapshot
- let client-side revalidation refresh the fallback after hydration

This keeps request boundaries clear and avoids leaking cache state across users.

## Per-Request Client

```ts
import { createSWRVClient } from "swrv";

export function createRequestSWRV() {
  return createSWRVClient();
}
```

Use one client per server render or per app instance, not a shared singleton.

## Providing SSR Fallback Data

```vue
<script setup lang="ts">
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
const fallback = {
  "/api/user": { id: "1", name: "Ada" },
};
</script>

<template>
  <SWRVConfig :value="{ client, fallback }">
    <App />
  </SWRVConfig>
</template>
```

For array or function keys, use `unstable_serialize()` to build the fallback
map key:

```ts
import { unstable_serialize } from "swrv";

const fallback = {
  [unstable_serialize(() => ["/api/team", 7] as const)]: { id: 7, name: "Platform" },
};
```

## Revalidation Behavior

Fallback values are returned immediately when the cache is empty. They remain
visible while the first request validates, and they are replaced by fetched data
once revalidation completes.

Fallback does not write into the cache by itself. That makes it a clean fit for
server-provided render data without turning the render payload into permanent
client cache state.

## Snapshot Helpers

If you want to serialize a request-scoped SWRV client into HTML and hydrate it
back into a fresh browser client, use `serializeSWRVSnapshot()` and
`hydrateSWRVSnapshot()`.

```ts
import { createSWRVClient, hydrateSWRVSnapshot, serializeSWRVSnapshot } from "swrv";

const serverClient = createSWRVClient();

// ...populate the server client through your data-fetch flow...

const snapshot = serializeSWRVSnapshot(serverClient);
```

Then on the client:

```ts
import { createSWRVClient, hydrateSWRVSnapshot } from "swrv";

const client = hydrateSWRVSnapshot(createSWRVClient(), window.__SWRV__);
```

The snapshot format is intentionally aligned with config-level `fallback`: it is
a serialized-key map of data values, not a dump of internal loading metadata.

## Server Safety

`useSWRV` and `useSWRVImmutable` do not start fetches during server rendering.
On the server they only read request-scoped `fallback` or hydrated snapshot
data, then leave revalidation to the client runtime after hydration.

Root-level `preload()` is a no-op during server rendering. That avoids
accidentally fetching through the shared global client on the server. Use
request-scoped fetching plus `fallback` or snapshot hydration instead.

If you want explicit validation that SSR handoff data exists, enable
`strictServerPrefetchWarning` on `SWRVConfig`. SWRV will warn when a server
render reaches a key with no fallback or hydrated snapshot data.

## Current Limits

The current public surface does not yet include:

- dedicated Nuxt integration
- a larger hydration API beyond explicit `client` plus `fallback`

Those areas can be added later without changing the current request-boundary
model.
