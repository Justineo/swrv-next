# SSR

## Current Supported Contract

SWRV's supported SSR path is intentionally explicit:

- create a fresh SWRV client per request
- provide that client with `SWRVConfig`
- pass request-specific initial data through config-level `fallback`
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

## Current Limits

The current public surface does not yet include:

- dedicated Nuxt integration
- specialized cache snapshot serialization helpers
- a larger hydration API beyond explicit `client` plus `fallback`

Those areas can be added later without changing the current request-boundary
model.
