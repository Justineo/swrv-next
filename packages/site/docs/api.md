---
title: API
description: Complete API reference for SWRV hooks and utilities.
---

# API

```ts
const { data, error, isLoading, isValidating, mutate } = useSWRV(key, fetcher, options);
```

> [!TIP]
> `useSWRV` is a composable. Real calls belong inside `setup()` or `<script setup>`. The signature
> above is reference syntax, not a standalone script.

## Parameters

- `key`: a unique key for the request. It can be a string, tuple, object, ref, computed ref,
  function, or a falsy value such as `null` [(details)](/arguments), [(advanced usage)](/conditional-fetching)
- `fetcher`: optional. A function that returns the data for the given key [(details)](/data-fetching)
- `options`: optional. A configuration object for this hook [(global defaults)](/global-configuration)

## Return values

- `data`: a Vue ref containing the resolved data for the key
- `error`: a Vue ref containing the last error thrown by the fetcher
- `isLoading`: a Vue ref that is `true` when a request is in flight and there is no loaded data yet
- `isValidating`: a Vue ref that is `true` whenever a request or revalidation is in flight
- `mutate(data?, options?)`: a bound mutation function for the current key [(details)](/mutation)

`fallbackData` and `keepPreviousData` can give you something to render while `isLoading` remains
`true`. This matches SWR’s idea that “loaded data” means resolved data for the active key, not
placeholder data.

More information can be found in [Understanding SWRV](/advanced/understanding).

## Options

- `fetcher(args)`: fetcher function for this hook [(details)](/data-fetching)
- `revalidateIfStale = true`: revalidate on activation when cached data exists [(details)](/revalidation)
- `revalidateOnMount`: explicitly enable or disable the first activation revalidation [(details)](/revalidation#revalidate-on-mount)
- `revalidateOnFocus = true`: revalidate when the window regains focus [(details)](/revalidation#revalidate-on-focus)
- `revalidateOnReconnect = true`: revalidate when the browser comes back online [(details)](/revalidation#revalidate-on-reconnect)
- `refreshInterval = 0`: polling interval in milliseconds, or a function of the latest data [(details)](/revalidation#revalidate-on-interval)
- `refreshWhenHidden = false`: keep polling when the document is hidden
- `refreshWhenOffline = false`: keep polling when the browser is offline
- `shouldRetryOnError = true`: retry after fetcher errors [(details)](/error-handling#error-retry)
- `dedupingInterval = 2000`: dedupe requests for the same key during this window
- `focusThrottleInterval = 5000`: throttle focus-triggered revalidation
- `loadingTimeout = 3000`: timeout for `onLoadingSlow`
- `errorRetryInterval = 5000`: delay between retries
- `errorRetryCount`: maximum number of retries
- `fallback`: key-value object for config-level fallback data [(details)](/global-configuration), [(SSR)](/server-rendering-and-hydration#pre-rendering-with-default-data)
- `fallbackData`: fallback data for this hook only [(details)](/prefetching#pre-fill-data)
- `strictServerPrefetchWarning = false`: warn during SSR when a key is rendered without prefetched
  data [(details)](/server-rendering-and-hydration#strict-warnings-for-missing-handoff-data)
- `keepPreviousData = false`: keep the previous key’s data while the new key loads [(details)](/advanced/understanding#return-previous-data-for-better-ux)
- `onLoadingSlow(key, config)`: callback when a request takes too long
- `onSuccess(data, key, config)`: callback when a request succeeds
- `onError(error, key, config)`: callback when a request fails [(details)](/error-handling#global-error-report)
- `onErrorRetry(error, key, config, revalidate, options)`: customize retry behavior [(details)](/error-handling#error-retry)
- `onDiscarded(key)`: callback when a stale response is discarded
- `compare(a, b)`: comparison function used to preserve data identity [(details)](/advanced/performance#deep-comparison)
- `isPaused()`: pause revalidation and ignore incoming results while paused
- `isVisible()`: custom visibility source
- `isOnline()`: custom online-state source
- `use`: middleware array [(details)](/middleware)
- `ttl`: compatibility-oriented cache expiration extension [(cache behavior)](/advanced/cache)

Provider-level options such as `client`, `cache`, `provider`, `initFocus`, and `initReconnect`
belong on [`SWRVConfig`](/global-configuration), not per-hook calls.

## Companion APIs

The root `swrv` package exports:

- `default` and `useSWRV`
- `SWRVConfig`
- `useSWRVConfig`
- `mutate`
- `preload`
- `createSWRVClient`
- `createCache`
- `unstable_serialize`
- `serializeSWRVSnapshot`
- `hydrateSWRVSnapshot`

### `SWRVConfig`

```vue
<SWRVConfig :value="{ fetcher, fallback, client }">
  <App />
</SWRVConfig>
```

Use `SWRVConfig` to provide shared fetchers, fallback data, middleware, and cache boundaries. The
`value` prop can be either an object or a function that receives the parent configuration.

### `useSWRVConfig`

```ts
const { cache, client, config, mutate, preload } = useSWRVConfig();
```

Use this inside `setup()` when you need the active scoped helpers instead of the root helpers.

### `mutate`

```ts
await mutate(key, data?, options?);
```

`mutate` supports:

- bound and global mutation
- optimistic updates
- `populateCache`
- `rollbackOnError`
- boolean or function `revalidate`
- filter-based mutation across multiple keys

See [Mutation](/mutation).

### `preload`

```ts
await preload(key, fetcher);
```

`preload` starts a request before a hook consumes it. It dedupes by serialized key and is consumed
by the first matching hook request. See [Prefetching](/prefetching).

### `unstable_serialize`

```ts
const serializedKey = unstable_serialize(key);
```

Use this when you need the exact serialized cache key, most commonly for `fallback` maps, snapshot
data, or advanced infinite-cache operations.

### Snapshot helpers

```ts
const snapshot = serializeSWRVSnapshot(client);
const hydratedClient = hydrateSWRVSnapshot(createSWRVClient(), snapshot);
```

These helpers are for SSR handoff. See [Server rendering and hydration](/server-rendering-and-hydration).

## `swrv/immutable`

```ts
import useSWRVImmutable from "swrv/immutable";
```

This keeps the same call shape as `useSWRV`, but disables stale revalidation, focus revalidation,
reconnect revalidation, and polling.

## `swrv/infinite`

```ts
const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRVInfinite(
  getKey,
  fetcher,
  options,
);
```

Use this for infinite loading and paginated page arrays. It also exports `unstable_serialize`.
See [Pagination](/pagination).

## `swrv/mutation`

```ts
const { data, error, isMutating, reset, trigger } = useSWRVMutation(key, fetcher, options);
```

Use this for imperative remote writes with dedicated mutation state. See [Mutation](/mutation).

## `swrv/subscription`

```ts
const { data, error } = useSWRVSubscription(key, subscribe, options);
```

Use this for real-time sources that push values through a disposer-based subscription contract. See
[Subscription](/subscription).

Both forms disable automatic focus and reconnect revalidation.

## Internal Entry Point

`swrv/_internal` is exported for advanced consumers who explicitly want the
rebuild's lower-level helpers. It is available, but it should not be treated as
the primary app-facing API.
