---
title: Subscription
description: Subscribe to live data sources with useSWRVSubscription.
---

# Subscription

`useSWRVSubscription` is a Vue composable for subscribing to real-time data sources with SWRV.

## `useSWRVSubscription`

```ts
const { data, error } = useSWRVSubscription(key, subscribe, options);
```

### API

This composable subscribes to a real-time data source using the provided `subscribe` function. It
returns the latest pushed data together with any error reported by the subscription source.

#### Parameters

- `key`: a unique key that identifies the subscribed data. It follows the same key rules as `useSWRV`.
- `subscribe(key, { next })`: a function that starts the subscription and returns a disposer.
- `options`: optional configuration, including middleware and fallback behavior.

For example:

```ts
function subscribe(key, { next }) {
  const subscription = remote.subscribe(key, (error, data) => next(error ?? undefined, data));
  return () => subscription.close();
}
```

You can also pass an updater function as `data` to `next`. It receives the previous data and
returns the next value:

```ts
function subscribe(key, { next }) {
  const subscription = remote.subscribe(key, (error, item) => {
    next(error ?? undefined, (previous = []) => previous.concat(item));
  });

  return () => subscription.close();
}
```

#### Return values

- `data`: the latest data received from the real-time source
- `error`: the latest error reported by the real-time source, if any

When new data is received, `error` is reset to `undefined`.

### Usage

Using `useSWRVSubscription` with a Firestore-style source:

```vue
<script setup lang="ts">
import useSWRVSubscription from "swrv/subscription";

const props = defineProps<{ postId: string }>();

const { data } = useSWRVSubscription(["views", props.postId] as const, ([_, postId], { next }) => {
  const ref = firebase.database().ref(`views/${postId}`);

  ref.on(
    "value",
    (snapshot) => next(undefined, snapshot.val()),
    (error) => next(error),
  );

  return () => ref.off();
});
</script>
```

Using `useSWRVSubscription` with a WebSocket source:

```vue
<script setup lang="ts">
import useSWRVSubscription from "swrv/subscription";

const { data, error } = useSWRVSubscription("ws://...", (key, { next }) => {
  const socket = new WebSocket(key);

  socket.addEventListener("message", (event) => next(undefined, event.data));
  socket.addEventListener("error", () => next(new Error("WebSocket error")));

  return () => socket.close();
});
</script>

<template>
  <p v-if="error">Failed to load.</p>
  <p v-else-if="data === undefined">Loading...</p>
  <p v-else>Hello {{ data }}!</p>
</template>
```

The `subscribe` function receives the original public key, not an internal serialized helper key.

See [TypeScript](/typescript#useswrvsubscription) for typed subscription examples.

### Deduplication

`useSWRVSubscription` dedupes subscription requests with the same key inside the current cache
boundary. If multiple components subscribe to the same key, they share one live subscription until
the last subscribing component unmounts.

Subscription caches are isolated from the normal `useSWRV` request cache. If you want a pushed
value to update a regular query key as well, do it explicitly through `mutate`.
