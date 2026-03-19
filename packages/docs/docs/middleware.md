# Middleware

Middleware lets you wrap SWRV hooks the same way SWR does.

## Basic shape

```ts
const logger = (useSWRNext) => (key, fetcher, config) => {
  console.log("swrv key", key);
  return useSWRNext(key, fetcher, config);
};
```

Register middleware:

- per hook with `config.use`
- per subtree with `SWRVConfig`

## Order

Middleware composes in SWR order:

- parent `SWRVConfig` middleware first
- nested `SWRVConfig` middleware next
- per-hook middleware last

## Original keys

For `useSWRVInfinite`, `useSWRVMutation`, and `useSWRVSubscription`, middleware still receives the original public key shape instead of the internal serialized helper key.

That makes middleware useful for logging, auth decoration, and instrumentation across the companion APIs too.

## Built-in immutable middleware

`swrv/immutable` uses the same middleware model to turn off stale revalidation, focus revalidation, reconnect revalidation, and polling.

## Devtools hooks

SWRV also exposes a lightweight built-in debug surface through:

- `window.__SWRV_DEVTOOLS_USE__`
- `window.__SWRV_DEVTOOLS_VUE__`

See [Advanced > Devtools](/advanced/devtools).
