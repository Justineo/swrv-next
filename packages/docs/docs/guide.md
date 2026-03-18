# Guide

## Goals

SWRV Next is designed around three constraints:

- align with SWR behavior where it improves predictability and migration
- stay idiomatic for Vue users by returning refs and fitting naturally into `setup()`
- keep cache domains explicit so SSR and multi-app boundaries are safe

## Basic Usage

```ts
import useSWRV from "swrv";

const { data, error, isLoading, isValidating, mutate } = useSWRV("/api/user", async (key) => {
  const response = await fetch(key);
  return response.json();
});
```

## Scoped Configuration

Use `SWRVConfig` to create a cache boundary or to override global behavior:

```ts
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
```

```vue
<SWRVConfig :value="{ client, dedupingInterval: 1500 }">
  <App />
</SWRVConfig>
```

## Mutation

```ts
import { mutate } from "swrv";

await mutate("/api/user", updateUser(), {
  optimisticData: (current) => ({ ...current, name: "Optimistic" }),
  rollbackOnError: true,
});
```

## Infinite Loading

```ts
import useSWRVInfinite from "swrv/infinite";

const swrv = useSWRVInfinite(
  (index) => ["/api/projects", index] as const,
  async (path, index) => {
    const response = await fetch(`${path}?page=${index}`);
    return response.json();
  },
  { initialSize: 2 },
);
```
