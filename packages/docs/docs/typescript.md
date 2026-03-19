# TypeScript

SWRV is designed to infer key and fetcher types while still exposing explicit type hooks when you need them.

## Key inference

Tuple keys become positional fetcher arguments.

```ts
useSWRV(["user", 8] as const, (resource, id) => {
  resource satisfies "user";
  id satisfies 8;
  return { id };
});
```

Object keys are inferred too.

```ts
useSWRV({ path: "/api/user", locale: "en" }, (key) => {
  key.path satisfies string;
  key.locale satisfies string;
  return key;
});
```

## Fallback data

When `fallbackData` is present, `data.value` is treated as defined for that hook call.

```ts
const swrv = useSWRV("/api/user", fetcher, {
  fallbackData: { id: "loading", name: "Loading" },
});

swrv.data.value.id;
```

## Shared fetchers from configuration

`useSWRV(key, config)` works when the fetcher is supplied through `SWRVConfig`.

```ts
const swrv = useSWRV<{ id: string }>("/api/user", {
  fallbackData: { id: "1" },
});
```

## Mutation trigger typing

`useSWRVMutation` preserves argument typing for:

- required trigger args
- optional trigger args
- no-arg triggers
- `throwOnError`

## Infinite and subscription typing

`useSWRVInfinite` infers page data and `getKey` relationships. `useSWRVSubscription` keeps the original key type in the subscribe callback.

## Public type exports

The package exports the main public types you are likely to use:

- `Fetcher`
- `BareFetcher`
- `RawKey`
- `KeySource`
- `SWRVConfiguration`
- `SWRVMiddleware`
- `MutatorOptions`

Most app code can rely on inference and only reach for explicit types at boundaries.
