---
title: Conditional fetching
description: Conditionally fetch data based on reactive dependencies or user state.
---

# Conditional fetching

Use `null` or pass a function as `key` to conditionally fetch data. If the function throws or
returns a falsy value, SWRV will not start the request.

> [!TIP]
> The examples below assume they run inside `setup()` or `<script setup>`.

## Conditional

Use a falsy key when the request should not run yet:

```ts
import { computed } from "vue";

const key = computed(() => (shouldFetch.value ? "/api/data" : null));
const { data } = useSWRV(key, fetcher);
```

```ts
// ...or return a falsy value from a function key
const { data } = useSWRV(() => (shouldFetch.value ? "/api/data" : null), fetcher);
```

```ts
// ...or throw when user.value is not defined yet
const { data } = useSWRV(() => `/api/data?uid=${user.value!.id}`, fetcher);
```

## Dependent

SWRV also allows you to fetch data that depends on other data. It keeps the maximum possible
parallelism, while still allowing serial loading when one dynamic value is required for the next
request.

```ts
const { data: user } = useSWRV("/api/user", fetcher);
const { data: projects } = useSWRV(() => `/api/projects?uid=${user.value!.id}`, fetcher);

// When passing a function, SWRV uses the return value as the key.
// If the function throws or returns a falsy value, SWRV knows that
// the dependency is not ready yet.
```

If the second key cannot be resolved yet, SWRV waits without starting a broken request or caching
under the wrong key.
