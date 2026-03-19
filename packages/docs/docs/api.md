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
- `serializeSWRVSnapshot`
- `hydrateSWRVSnapshot`
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
- during server rendering, hooks read fallback or hydrated snapshot data but do not start fetches

High-value options:

- `fallbackData`
- `keepPreviousData`
- `fetcher`
- `revalidateOnMount`
- `revalidateOnFocus`
- `revalidateOnReconnect`
- `revalidateIfStale`
- `refreshInterval`
- `dedupingInterval`
- `focusThrottleInterval`
- `isPaused`
- `isVisible`
- `isOnline`
- `shouldRetryOnError`
- `onSuccess`
- `onError`
- `onErrorRetry`
- `onDiscarded`
- `onLoadingSlow`
- `ttl`

## `preload`

```ts
await preload(key, fetcher);
```

Key notes:

- accepts string, tuple, object, ref, and function keys
- resolves tuple keys into positional fetcher arguments
- dedupes repeated preload calls until a hook consumes the request
- is a no-op on the server so request-scoped SSR flows stay explicit
- failed preload requests are cleared so a later preload or hook fetch can retry
- preloaded page keys are also consumed by `useSWRVInfinite`

## `mutate`

```ts
await mutate(key, data?, options?)
```

Supports:

- bound and global mutation
- optimistic updates
- `populateCache`
- `rollbackOnError`
- boolean or function `revalidate`
- filtered mutation with a key predicate

## `unstable_serialize`

```ts
const serialized = unstable_serialize(key);
```

Use this when you need the same serialized key that SWRV uses internally, most
commonly for config `fallback` maps or for targeted `infinite` cache updates.

## `serializeSWRVSnapshot(client)`

```ts
const snapshot = serializeSWRVSnapshot(client);
```

Returns a JSON-serializable serialized-key map of cached data values. This is
meant for SSR handoff, not for exposing internal loading metadata.

## `hydrateSWRVSnapshot(client, snapshot)`

```ts
const client = hydrateSWRVSnapshot(createSWRVClient(), snapshot);
```

Seeds a client from a serialized snapshot and returns that client. Hydrated data
is visible immediately, and normal revalidation can still refresh it on mount.

## `createSWRVClient`

```ts
const client = createSWRVClient();
```

Use this when you need an explicit cache boundary:

- one Vue app embedded inside another
- isolated test setups
- one client per SSR request
- custom provider or cache behavior

## `createCache`

```ts
const cache = createCache();
```

This creates the default in-memory cache shape used by `createSWRVClient()`.
Most app code does not need it directly, but it is available when you want to
build a client from an explicit cache instance or layer a custom provider
boundary on top of the default cache behavior.

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
- `strictServerPrefetchWarning` for warning on missing SSR handoff data
- `refreshInterval`, `dedupingInterval`, and `ttl`

## `useSWRVConfig`

```ts
const { cache, client, config, mutate, preload } = useSWRVConfig();
```

Use this inside `setup()` when you need the active scoped helpers instead of the
root helpers.

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

Useful options:

- `optimisticData`
- `populateCache`
- `rollbackOnError`
- `throwOnError`
- `revalidate`
- `onSuccess`
- `onError`

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

High-value options:

- `initialSize`
- `parallel`
- `persistSize`
- `revalidateAll`
- `revalidateFirstPage`
- `fetcher`
- `compare`

## `swrv/immutable`

`swrv/immutable` exports:

- the default `useSWRVImmutable` hook
- a named `immutable` middleware for `use: [immutable]` composition

Both forms disable automatic focus and reconnect revalidation.

## Internal Entry Point

`swrv/_internal` is exported for advanced consumers who explicitly want the
rebuild's lower-level helpers. It is available, but it should not be treated as
the primary app-facing API.
