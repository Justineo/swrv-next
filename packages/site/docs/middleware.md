---
title: Middleware
description: Extend SWRV hooks with reusable middleware.
---

# Middleware

Middleware lets you execute logic before and after SWRV hooks. If there are multiple middleware,
each one wraps the next middleware, and the last middleware wraps the original SWRV hook.

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

useSWRV("/api/user", fetcher, { use: [logger] });
</script>

<template>
  <SWRVConfig :value="{ use: [logger] }">
    <App />
  </SWRVConfig>
</template>
```

## API

A middleware receives the next SWRV hook and returns a wrapped version of it:

```ts
const middleware = (useSWRVNext) => (key, fetcher, config) => {
  // Before hook runs...
  return useSWRVNext(key, fetcher, config);
  // After hook runs...
};
```

Unlike React, Vue does not have the same Hook lint rule about function names. The important part is
that middleware stays a plain function and composables are still called inside setup scope.

See [TypeScript](/typescript#middleware-types) for the exported middleware helper types.

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

Middleware extends exactly like regular config options. For example:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const a = (useSWRVNext) => (key, fetcher, config) => useSWRVNext(key, fetcher, config);
const b = (useSWRVNext) => (key, fetcher, config) => useSWRVNext(key, fetcher, config);
const c = (useSWRVNext) => (key, fetcher, config) => useSWRVNext(key, fetcher, config);
</script>

<template>
  <SWRVConfig :value="{ use: [a] }">
    <SWRVConfig :value="{ use: [b] }">
      <Child />
    </SWRVConfig>
  </SWRVConfig>
</template>
```

```ts
useSWRV(key, fetcher, { use: [c] });
// equivalent composition order: [a, b, c]
```

Middleware can also replace the fetcher or inject config:

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

Each middleware wraps the next middleware. For example:

```ts
useSWRV(key, fetcher, { use: [a, b, c] });
```

Execution order is:

```text
enter a
  enter b
    enter c
      useSWRV()
    exit  c
  exit  b
exit  a
```

That matches SWR's composition model. Middleware order also follows config boundaries:

1. parent `SWRVConfig` middleware
2. nested `SWRVConfig` middleware
3. per-hook middleware

This makes it easy to keep broad behavior at the app boundary and local behavior at the hook call.

## Examples

### Request logger

```ts
const logger = (useSWRVNext) => (key, fetcher, config) => {
  const loggedFetcher =
    fetcher &&
    (async (...args: Parameters<typeof fetcher>) => {
      console.log("SWRV request:", key);
      return fetcher(...args);
    });

  return useSWRVNext(key, loggedFetcher ?? fetcher, config);
};
```

Every time the request is fired, it prints the SWRV key to the console:

```text
SWRV request: /api/user1
SWRV request: /api/user2
```

### Keep previous result

SWR’s middleware docs show a custom "laggy" middleware that keeps previous data during key changes.
In SWRV, the preferred solution is the built-in [`keepPreviousData`](/advanced/understanding#return-previous-data-for-better-ux)
option:

```ts
useSWRV(key, fetcher, {
  keepPreviousData: true,
});
```

### Serialize object keys

SWR’s middleware docs also show a custom key-serialization middleware. In SWRV, object and tuple
keys are already serialized internally, so you usually do not need custom middleware for that.

See [Arguments](/arguments#passing-objects) for the built-in key behavior.

### Set shared defaults

```ts
const noFocusRevalidate = (useSWRVNext) => (key, fetcher, config) => {
  return useSWRVNext(key, fetcher, {
    ...config,
    revalidateOnFocus: false,
  });
};
```

SWR’s middleware examples sometimes demonstrate features that SWRV already supports directly:

- use `keepPreviousData` instead of custom “laggy” middleware [(details)](/advanced/understanding#return-previous-data-for-better-ux)
- rely on built-in key serialization for object keys [(details)](/arguments#passing-objects)
- use `swrv/immutable` or the named `immutable` middleware for immutable resources [(details)](/revalidation#disable-automatic-revalidations)

That keeps middleware focused on cross-cutting concerns such as logging, auth, analytics, or
debugging.
