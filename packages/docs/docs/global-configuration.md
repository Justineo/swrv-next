# Global configuration

`SWRVConfig` provides shared configuration to every hook inside the boundary.

```vue
<script setup lang="ts">
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
const value = {
  client,
  dedupingInterval: 1500,
  fetcher: async (url: string) => {
    const response = await fetch(url);
    return response.json();
  },
};
</script>

<template>
  <SWRVConfig :value="value">
    <App />
  </SWRVConfig>
</template>
```

## Shared fetchers

Provide `fetcher` here when most requests in the subtree should use the same network logic.

## Fallback data

Use `fallback` for config-level initial data keyed by the serialized SWRV key.

```ts
const fallback = {
  "/api/user": { id: "1", name: "Ada" },
};
```

This is the right tool for SSR handoff and request-scoped initial data.

## Provider and cache boundaries

You can isolate or extend cache state with:

- `client`
- `cache`
- `provider`

Use these when you need explicit cache ownership for one app, one test, or one SSR request.

## Middleware

Use `value.use` to register middleware for everything inside the boundary.

```ts
const logger = (useSWRNext) => (key, fetcher, config) => {
  console.log("swrv key", key);
  return useSWRNext(key, fetcher, config);
};
```

## Functional values

`value` can also be a function. It receives the parent config and returns a replacement object.

```ts
const scopedValue = (parent: ReturnType<typeof useSWRVConfig>["config"]) => ({
  ...parent,
  dedupingInterval: 500,
});
```

## useSWRVConfig

Inside a boundary, `useSWRVConfig()` gives you the active:

- `cache`
- `client`
- `config`
- `mutate`
- `preload`
