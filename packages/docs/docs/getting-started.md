# Getting started

SWRV is stale-while-revalidate data fetching for Vue. The new version follows SWR closely, but keeps Vue-native returns and explicit cache boundaries.

## Install

```bash
vp add swrv vue
```

## Quick start

```ts
import useSWRV from "swrv";

const { data, error, isLoading, isValidating, mutate } = useSWRV("/api/user", async (key) => {
  const response = await fetch(key);
  if (!response.ok) {
    throw new Error("Failed to load the current user.");
  }
  return response.json() as Promise<{ id: string; name: string }>;
});
```

`data`, `error`, `isLoading`, and `isValidating` are Vue refs. In templates you can read them directly. In script code, use `.value`.

## Use a shared fetcher

If your app uses one fetcher shape everywhere, provide it once with `SWRVConfig`.

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const config = {
  fetcher: async (key: string) => {
    const response = await fetch(key);
    return response.json();
  },
};
</script>

<template>
  <SWRVConfig :value="config">
    <App />
  </SWRVConfig>
</template>
```

Now any `useSWRV(key)` call inside that boundary can reuse the shared fetcher.

## Create an explicit cache boundary

Use `createSWRVClient()` and `SWRVConfig` when you need one cache per app, test, or SSR request.

```ts
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
```

```vue
<SWRVConfig :value="{ client }">
  <App />
</SWRVConfig>
```

## Where to go next

- Learn how keys work on [Arguments and keys](/arguments-and-keys).
- See the complete surface on [API](/api).
- Configure polling, focus, and reconnect behavior on [Automatic revalidation](/automatic-revalidation).
- Use mutation and pagination on [Mutation and revalidation](/mutation-and-revalidation) and [Pagination](/pagination).
