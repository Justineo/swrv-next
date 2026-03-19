# API

This page is the fast reference for the published surface. The deeper behavior pages live elsewhere in the docs.

## Package root

The root `swrv` package exports:

- `default` and `useSWRV`
- `SWRVConfig`
- `useSWRVConfig`
- `mutate`
- `preload`
- `createSWRVClient`
- `createCache`
- `serializeSWRVSnapshot`
- `hydrateSWRVSnapshot`
- `unstable_serialize`

## useSWRV

```ts
const response = useSWRV(key, fetcher?, config?)
```

Returned refs:

- `data`
- `error`
- `isLoading`
- `isValidating`
- `mutate`

Key points:

- keys can be strings, tuples, objects, refs, functions, or `null`
- tuple keys are passed to the fetcher as positional arguments
- `fallbackData` is local to the hook
- config-level `fallback` works across a whole `SWRVConfig` boundary
- hooks do not start fetching during server rendering

Common options:

- `fetcher`
- `fallbackData`
- `keepPreviousData`
- `revalidateOnMount`
- `revalidateIfStale`
- `revalidateOnFocus`
- `revalidateOnReconnect`
- `refreshInterval`
- `dedupingInterval`
- `focusThrottleInterval`
- `isPaused`
- `isVisible`
- `isOnline`
- `onSuccess`
- `onError`
- `onErrorRetry`
- `onDiscarded`
- `onLoadingSlow`
- `ttl`

See [Arguments and keys](/arguments-and-keys), [Automatic revalidation](/automatic-revalidation), and [Error handling](/error-handling) for the behavior details.

## SWRVConfig

```vue
<SWRVConfig :value="{ client, fallback, fetcher }">
  <App />
</SWRVConfig>
```

`value` can be:

- a plain configuration object
- a function that receives the parent config and returns a replacement object

The main responsibilities of `SWRVConfig` are:

- providing a shared fetcher
- creating or extending cache boundaries
- defining config-level fallback data
- composing middleware
- customizing focus and reconnect event sources

See [Global configuration](/global-configuration).

## useSWRVConfig

```ts
const { cache, client, config, mutate, preload } = useSWRVConfig();
```

Use this inside `setup()` when you need the active scoped helpers instead of the root helpers.

## mutate

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

See [Mutation and revalidation](/mutation-and-revalidation).

## preload

```ts
await preload(key, fetcher);
```

`preload`:

- accepts the same key shapes as `useSWRV`
- dedupes repeated preloads for the same serialized key
- is consumed by the first matching hook request
- is a no-op on the server

See [Prefetching data](/prefetching-data).

## unstable_serialize

```ts
const serialized = unstable_serialize(key);
```

Use this when you need the same serialized cache key that SWRV uses internally, most commonly for config `fallback` maps or targeted cache operations.

## createSWRVClient and createCache

```ts
const client = createSWRVClient();
const cache = createCache();
```

Most apps only need `createSWRVClient()`. `createCache()` is useful when you want to provide a specific cache instance to a custom provider boundary.

## serializeSWRVSnapshot and hydrateSWRVSnapshot

```ts
const snapshot = serializeSWRVSnapshot(client);
const hydrated = hydrateSWRVSnapshot(createSWRVClient(), snapshot);
```

These helpers are for server rendering and hydration handoff. See [Server rendering and hydration](/server-rendering-and-hydration).

## swrv/immutable

```ts
import useSWRVImmutable from "swrv/immutable";
```

This keeps the same call shape as `useSWRV`, but disables stale revalidation, focus revalidation, reconnect revalidation, and polling.

## swrv/infinite

```ts
const { data, error, isLoading, isValidating, mutate, size, setSize } =
  useSWRVInfinite(getKey, fetcher, config?)
```

Use this for pagination and infinite loading. It also exports `unstable_serialize`.

See [Pagination](/pagination).

## swrv/mutation

```ts
const { data, error, isMutating, reset, trigger } =
  useSWRVMutation(key, fetcher, config?)
```

Use this for imperative remote writes with dedicated mutation state.

See [Mutation and revalidation](/mutation-and-revalidation).

## swrv/subscription

```ts
const { data, error } = useSWRVSubscription(key, subscribe, config?)
```

Use this for real-time data sources that push new values through a disposer-based subscription contract.

See [Subscription](/subscription).

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
