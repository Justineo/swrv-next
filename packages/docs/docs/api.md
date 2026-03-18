# API

## Package Root

`swrv` currently exports:

- `default` / `useSWRV`
- `SWRVConfig`
- `useSWRVConfig`
- `mutate`
- `preload`
- `createSWRVClient`
- `createCache`
- `unstable_serialize`

## `useSWRV`

```ts
const response = useSWRV(key, fetcher?, config?)
```

Response shape:

- `data`
- `error`
- `isLoading`
- `isValidating`
- `mutate`

Key notes:

- array keys are supported and typed as positional fetcher arguments
- function and ref keys are supported
- state values are Vue refs
- `fallbackData` is per-hook
- `SWRVConfig` can provide app-level `fallback` values keyed by serialized key

## `preload`

```ts
await preload(key, fetcher);
```

Key notes:

- accepts string, tuple, object, ref, and function keys
- resolves tuple keys into positional fetcher arguments
- dedupes repeated preload calls until a hook consumes the request
- failed preload requests are cleared so a later preload or hook fetch can retry
- preloaded page keys are also consumed by `useSWRVInfinite`

## `SWRVConfig`

```ts
<SWRVConfig :value="{ client, fallback, dedupingInterval }">
  <App />
</SWRVConfig>
```

`value` can also be a function that receives the parent config and returns a
replacement config object.

Current supported high-value options include:

- `client`, `cache`, and `provider` for cache boundaries
- `fallback` for config-level initial data
- `fetcher` for a shared fetcher
- `use` for SWR-style middleware composition across `useSWRV` and companion hooks
- revalidation controls such as `revalidateOnMount`, `revalidateOnFocus`, `revalidateOnReconnect`, and `isPaused`
- activity overrides through `isVisible` and `isOnline`
- lifecycle callbacks through `onSuccess` and `onError`
- retry and race callbacks through `onErrorRetry` and `onDiscarded`
- slow-request handling through `loadingTimeout` and `onLoadingSlow`
- `refreshInterval`, `dedupingInterval`, and `ttl`

## `swrv/mutation`

```ts
const { data, error, isMutating, trigger, reset } = useSWRVMutation(
  key,
  fetcher,
  config?,
);
```

`trigger(arg, options?)` returns the mutation result and now ignores stale local results after `reset()` or a newer trigger.
When `throwOnError` is `false`, the hook still records local error state and fires `onError`.

## `swrv/subscription`

```ts
const { data, error } = useSWRVSubscription(key, subscribe);
```

The `subscribe` callback:

- receives the original key value plus `{ next }`
- must return an unsubscribe function
- can report errors with `next(error)` without discarding the last good data value

## `swrv/infinite`

```ts
const { data, error, isLoading, isValidating, mutate, size, setSize } =
  useSWRVInfinite(getKey, fetcher, config?)
```

Current behavior highlights:

- supports cursor-style sequential loading
- supports `parallel: true`
- exposes `unstable_serialize`
- consumes preloaded page requests from `preload`
- treats `setSize()` as a page-oriented operation
- no-arg `mutate()` revalidates the loaded pages
- bound `mutate(data, { revalidate })` supports page-selective revalidation callbacks

## `swrv/immutable`

`useSWRVImmutable` is a `useSWRV` variant with automatic focus/reconnect revalidation disabled.
