---
title: Middleware
description: Extend SWRV hooks with reusable middleware.
---

# Middleware

Middleware lets you wrap SWRV hooks the same way SWR does.

## Usage

Register middleware either per hook or through `SWRVConfig`:

```ts
const logger = (useSWRVNext) => (key, fetcher, config) => {
  console.log("swrv key", key);
  return useSWRVNext(key, fetcher, config);
};
```

```vue
<script setup lang="ts">
import useSWRV, { SWRVConfig } from "swrv";

const logger = (useSWRVNext) => (key, fetcher, config) => {
  console.log("swrv key", key);
  return useSWRVNext(key, fetcher, config);
};

const value = { use: [logger] };
const user = useSWRV("/api/user", fetcher, { use: [logger] });
</script>

<template>
  <SWRVConfig :value="value">
    <App />
  </SWRVConfig>
</template>
```

## API

A middleware receives the next SWRV hook and returns a wrapped version of it:

```ts
const middleware = (useSWRVNext) => (key, fetcher, config) => {
  return useSWRVNext(key, fetcher, config);
};
```

The wrapped call still receives the original public key shape. That matters for:

- tuple keys
- object keys
- function keys
- `useSWRVInfinite`
- `useSWRVMutation`
- `useSWRVSubscription`

See [Arguments](/arguments), [Pagination](/pagination), [Mutation](/mutation), and
[Subscription](/subscription) for those API surfaces.

Middleware can inspect or replace the fetcher, inject options, or wrap the returned response.

## Extend

Middleware is composable, so one middleware can extend another:

```ts
const withTiming = (useSWRVNext) => (key, fetcher, config) => {
  const timedFetcher =
    fetcher &&
    (async (...args: Parameters<typeof fetcher>) => {
      const startedAt = performance.now();
      try {
        return await fetcher(...args);
      } finally {
        console.log("request time", performance.now() - startedAt);
      }
    });

  return useSWRVNext(key, timedFetcher ?? fetcher, config);
};
```

## Multiple middleware

Middleware order matches SWR’s composition order:

1. parent `SWRVConfig` middleware
2. nested `SWRVConfig` middleware
3. per-hook middleware

This makes it easy to keep broad behavior at the app boundary and local behavior at the hook call.

## Examples

### Request logger

```ts
const logger = (useSWRVNext) => (key, fetcher, config) => {
  console.log("request", key);
  return useSWRVNext(key, fetcher, config);
};
```

### Set shared defaults

```ts
const noFocusRevalidate = (useSWRVNext) => (key, fetcher, config) => {
  return useSWRVNext(key, fetcher, {
    ...config,
    revalidateOnFocus: false,
  });
};
```

### Prefer built-in features where they exist

SWR’s middleware examples sometimes demonstrate features that SWRV already supports directly:

- use `keepPreviousData` instead of custom “laggy” middleware [(details)](/advanced/understanding#return-previous-data-for-better-ux)
- rely on built-in key serialization for object keys [(details)](/arguments#passing-objects)
- use `swrv/immutable` or the named `immutable` middleware for immutable resources [(details)](/revalidation#disable-automatic-revalidations)

That keeps middleware focused on cross-cutting concerns such as logging, auth, analytics, or
debugging.
