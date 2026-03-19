---
title: Subscription
description: Subscribe to live data sources with useSWRVSubscription.
---

# Subscription

Use `swrv/subscription` when the data source pushes updates instead of being fetched on demand.

## `useSWRVSubscription`

```ts
const { data, error } = useSWRVSubscription(key, subscribe, options);
```

### API

- `key`: subscription identity. It uses the same key shapes as `useSWRV`.
- `subscribe(key, { next })`: starts the subscription and returns a disposer.
- `options`: optional configuration, including middleware and fallback behavior.

### Usage

```vue
<script setup lang="ts">
import useSWRVSubscription from "swrv/subscription";

const roomId = "room-1";

const { data, error } = useSWRVSubscription(["room", roomId] as const, (key, { next }) => {
  const channel = socket.subscribe(key, (subscriptionError, payload) => {
    next(subscriptionError ?? undefined, payload);
  });

  return () => {
    channel.close();
  };
});
</script>
```

The `subscribe` function receives the original public key, not an internal serialized helper key.

Call:

- `next(error)` to publish a failure
- `next(undefined, data)` to publish a new value

Errors do not automatically clear the last good data value. That lets the UI keep rendering the
latest usable payload while still surfacing the failure.

### Deduplication

Subscriptions are deduped within the current cache boundary. If two consumers subscribe to the same
key under the same `SWRVConfig`, SWRV keeps one live subscription and shares the pushed data with
both consumers.

Subscription caches are isolated from the normal `useSWRV` request cache. If you want a pushed
value to update a regular query key as well, do it explicitly through `mutate`.
