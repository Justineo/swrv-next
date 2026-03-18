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

## `SWRVConfig`

```ts
<SWRVConfig :value="{ client, fallback, dedupingInterval }">
  <App />
</SWRVConfig>
```

Current supported high-value options include:

- `client`, `cache`, and `provider` for cache boundaries
- `fallback` for config-level initial data
- `fetcher` for a shared fetcher
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
- treats `setSize()` as a page-oriented operation
- no-arg `mutate()` revalidates the loaded pages

## `swrv/immutable`

`useSWRVImmutable` is a `useSWRV` variant with automatic focus/reconnect revalidation disabled.
