---
title: Arguments
description: Pass arguments to SWRV fetcher functions.
---

# Arguments

By default, the `key` identifies the request and is also forwarded to the fetcher.

> [!TIP]
> Hook snippets on this page assume they are called inside `setup()` or `<script setup>`.

Inside `setup()`, these expressions are equivalent:

```ts
useSWRV("/api/user", () => fetcher("/api/user"));
useSWRV("/api/user", (url) => fetcher(url));
useSWRV("/api/user", fetcher);
```

## Multiple arguments

Sometimes a request depends on more than one value, such as an authenticated URL:

```ts
useSWRV("/api/user", (url) => fetchWithToken(url, token.value));
```

That is not enough, because the cache key is still only `"/api/user"`. If `token.value` changes,
the request identity has changed but the cache key has not.

Instead, use a tuple key:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const token = "secret";

const { data: user } = useSWRV(["/api/user", token] as const, async (url, authToken) => {
  return fetchWithToken(url, authToken);
});
</script>
```

In SWRV, tuple keys are spread into the fetcher as positional arguments. That keeps the fetcher
signature ergonomic in Vue code while still tying every argument to the cache key.

## Passing objects

Object keys work too:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const { data: orders } = useSWRV(
  { url: "/api/orders", userId: "user-1", locale: "en" },
  async (key) => {
    const response = await fetch(`${key.url}?userId=${key.userId}&locale=${key.locale}`);
    return response.json();
  },
);
</script>
```

SWRV serializes object keys internally, so two deeply equal object keys resolve to the same cache
identity.

## Refs and computed keys

Keys can also be refs or computed refs:

```vue
<script setup lang="ts">
import { computed } from "vue";
import useSWRV from "swrv";

const routeUserId = "42";
const key = computed(() => `/api/users/${routeUserId}`);
const user = useSWRV(key, fetcher);
</script>
```

When the ref changes, SWRV treats it as a key change and re-evaluates the request.

## Mutate and serialize against the same key

Use the original public key when you call `mutate`:

```ts
await mutate(["/api/user", token], nextUser);
```

Use `unstable_serialize` only when you need the internal serialized form, such as:

- config-level `fallback` maps
- SSR snapshot handoff
- advanced `useSWRVInfinite` coordination
