# Prefetching data

Use `preload` to fetch data before the hook requests it.

```ts
import { preload } from "swrv";

await preload("/api/user", async (key) => {
  const response = await fetch(key);
  return response.json();
});
```

## What preload does

`preload`:

- accepts the same key shapes as `useSWRV`
- dedupes repeated preloads by serialized key
- clears failed entries so a later preload or hook request can retry
- hands the response to the first matching hook request

## Tuple and function keys

Tuple and function keys work too.

```ts
await preload(["/api/user", token.value] as const, async (url, token) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
});
```

## Infinite pages

`useSWRVInfinite` can consume preloaded page keys, including multiple preloaded pages in parallel mode.

## Server note

`preload` is a no-op on the server. For SSR, use config `fallback` or snapshot hydration instead.
