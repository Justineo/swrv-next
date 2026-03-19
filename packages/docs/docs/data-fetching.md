# Data fetching

The core contract is:

```ts
const { data, error } = useSWRV(key, fetcher);
```

The fetcher receives the key and returns either a value or a promise.

## Fetch with `fetch`

```ts
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Request failed.");
  }
  return response.json();
};
```

## Use a shared fetcher

If your app uses one fetcher everywhere, set it on `SWRVConfig`.

```ts
const config = {
  fetcher: async (url: string) => {
    const response = await fetch(url);
    return response.json();
  },
};
```

Then the hook can omit the positional fetcher:

```ts
const swrv = useSWRV("/api/user");
```

## Disable a positional fetcher

SWRV accepts `null`, `undefined`, and `false` as disabled fetchers.

```ts
useSWRV("/api/user", false);
```

This is useful when you want the hook shape, cached data, or config-driven behavior without starting a request locally.

## Keep fetchers pure

Treat fetchers as pure request functions:

- take the key
- return data or throw an error
- avoid mutating cache directly inside the fetcher

Use `mutate` and `useSWRVMutation` for writes instead.
