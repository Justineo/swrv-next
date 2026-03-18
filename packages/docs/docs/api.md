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

## `swrv/mutation`

```ts
const { data, error, isMutating, trigger, reset } = useSWRVMutation(
  key,
  fetcher,
  config?,
);
```

## `swrv/subscription`

```ts
const { data, error } = useSWRVSubscription(key, subscribe);
```

The `subscribe` callback receives `{ next }` and must return an unsubscribe function.

## `swrv/infinite`

```ts
const { data, error, isLoading, isValidating, mutate, size, setSize } =
  useSWRVInfinite(getKey, fetcher, config?)
```

## `swrv/immutable`

`useSWRVImmutable` is a `useSWRV` variant with automatic focus/reconnect revalidation disabled.
