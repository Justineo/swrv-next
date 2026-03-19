---
title: TypeScript
description: Use SWRV with TypeScript inference and explicit generics.
---

# TypeScript

SWRV is designed to infer key, fetcher, and mutation types while still exposing explicit types when
you need them.

> [!TIP]
> The snippets on this page focus on types. Assume they live inside `<script setup lang="ts">`
> unless a snippet is showing a standalone helper type or function.

## Basic usage

### `useSWRV`

Tuple keys infer positional fetcher arguments:

```ts
const response = useSWRV(["user", 8] as const, async (resource, id) => {
  resource satisfies "user";
  id satisfies 8;
  return { id, resource };
});
```

Object keys infer object structure as well:

```ts
const response = useSWRV({ path: "/api/user", locale: "en" }, async (key) => {
  key.path satisfies string;
  key.locale satisfies string;
  return { locale: key.locale };
});
```

Remember that the return values are refs:

```ts
response.data.value;
response.error.value;
```

### `useSWRVInfinite`

`useSWRVInfinite` infers the page data and the `getKey` relationship:

```ts
type Page = { items: string[]; nextCursor: string | null };

const response = useSWRVInfinite<Page>(
  (index, previousPage) => ["/api/projects", previousPage?.nextCursor ?? index] as const,
  async (url, cursor) => ({ items: [`${url}:${cursor}`], nextCursor: null }),
);
```

### `useSWRVSubscription`

The subscribe callback keeps the original key type:

```ts
const response = useSWRVSubscription(["room", 1] as const, (key, { next }) => {
  key[0] satisfies "room";
  key[1] satisfies number;
  next(undefined, { connected: true });
  return () => {};
});
```

## Generics

In many cases, the fetcher type is enough and you do not need explicit generics:

```ts
const getUser = async (url: string) => {
  const response = await fetch(url);
  return response.json() as Promise<{ id: string; name: string }>;
};

const response = useSWRV("/api/user", getUser);
```

If the fetcher is less specific, pass the data type explicitly:

```ts
const response = useSWRV<{ id: string; name: string }>("/api/user", fetcher);
```

`fallbackData` narrows `data.value` for that hook call:

```ts
const response = useSWRV("/api/user", fetcher, {
  fallbackData: { id: "loading", name: "Loading" },
});

response.data.value.id;
```

`useSWRV(key, config)` also works when the fetcher comes from `SWRVConfig`:

```ts
const response = useSWRV<{ id: string }>("/api/user", {
  fallbackData: { id: "1" },
});
```

`useSWRVMutation` preserves trigger argument typing for required args, optional args, and no-arg
triggers:

```ts
const mutation = useSWRVMutation("/api/user", async (_key, { arg }: { arg: { name: string } }) => ({
  id: "1",
  name: arg.name,
}));

void mutation.trigger({ name: "Ada" });
```

## Middleware types

The package exports the main public types you are likely to use:

- `Fetcher`
- `BareFetcher`
- `RawKey`
- `KeySource`
- `SWRVConfiguration`
- `SWRVMiddleware`
- `MutatorOptions`

Most application code can rely on inference and only reach for explicit types at boundaries such as
shared fetchers, composable libraries, or middleware packages.
