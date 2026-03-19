# Subscription

Use `swrv/subscription` when your data source pushes values instead of being fetched on demand.

```ts
import useSWRVSubscription from "swrv/subscription";

const swrv = useSWRVSubscription(["room", roomId.value] as const, (key, { next }) => {
  const channel = socket.subscribe(key, (error, payload) => next(error, payload));
  return () => channel.close();
});
```

## Subscription contract

The `subscribe` function:

- receives the original key value
- receives `{ next }`
- must return an unsubscribe function

Call `next(error)` to publish a failure, or `next(null, data)` to publish new data.

## Error behavior

Subscription errors do not clear the last good data value by default. That matches the SWR model of keeping usable data visible when a later update fails.

## Cache scope and dedupe

Subscriptions are deduped inside the current cache boundary. Two consumers inside the same provider share one subscription and one cached value.
