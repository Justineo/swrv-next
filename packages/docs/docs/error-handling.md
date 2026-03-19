# Error handling

If the fetcher throws, the error is exposed through `error`.

```ts
const { data, error } = useSWRV("/api/user", async (key) => {
  const response = await fetch(key);
  if (!response.ok) {
    throw new Error("Failed to fetch the user.");
  }
  return response.json();
});
```

## Keep the last good data

Like SWR, SWRV can show `data` and `error` at the same time. A revalidation may fail while the last successful data value still exists.

That makes it possible to keep the old screen state visible while still surfacing the new failure.

## Retry behavior

Automatic retries are controlled through:

- `shouldRetryOnError`
- `errorRetryCount`
- `errorRetryInterval`
- `onErrorRetry`

```ts
useSWRV("/api/user", fetcher, {
  errorRetryCount: 2,
  shouldRetryOnError: (error) => error.message !== "Not found",
});
```

## Lifecycle callbacks

Use `onError` for side effects such as logging or toasts.

```ts
useSWRV("/api/user", fetcher, {
  onError(error) {
    console.error(error);
  },
});
```

For mutation flows, see [Mutation and revalidation](/mutation-and-revalidation).
