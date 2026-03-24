---
title: TypeScript
description: Use SWRV with TypeScript inference and explicit generics.
---

# TypeScript

SWRV is friendly for apps written in TypeScript, with type safety out of the box.

> [!TIP]
> The snippets on this page focus on types. Assume they live inside `<script setup lang="ts">`
> unless a snippet is showing a standalone helper type or function.

## Basic usage

### `useSWRV`

By default, SWRV also infers the argument types of `fetcher` from `key`:

```ts
// `key` is inferred as `string`
useSWRV("/api/user", async (key) => key);
useSWRV(
  () => "/api/user",
  async (key) => key,
);
```

```ts
// `key` is inferred as the object shape
useSWRV({ a: "1", b: { c: "3", d: 2 } }, async (key) => key);
useSWRV(
  () => ({ a: "1", b: { c: "3", d: 2 } }),
  async (key) => key,
);
```

```ts
// tuple keys are spread into fetcher arguments in SWRV
useSWRV(["user", 8] as const, async (arg0, arg1) => ({ arg0, arg1 }));
useSWRV(
  () => ["user", 8] as const,
  async (arg0, arg1) => ({ arg0, arg1 }),
);
```

You can also explicitly specify the types for `key` and the fetcher:

```ts
import useSWRV, { type Fetcher } from "swrv";

const uid = "<user_id>";
const fetcher: Fetcher<User, string> = (id) => getUserById(id);

const { data } = useSWRV(uid, fetcher);
// `data` is `Ref<User | undefined>`.
```

By default, the error thrown inside `fetcher` is `unknown`. You can also specify it explicitly:

```ts
const { data, error } = useSWRV<User, Error>(uid, fetcher);
// `data` is `Ref<User | undefined>`.
// `error` is `Ref<Error | undefined>`.
```

### `useSWRVInfinite`

The same applies to `swrv/infinite`:

```ts
import useSWRVInfinite from "swrv/infinite";
import type { SWRVInfiniteKeyLoader } from "swrv";

type Page = { data: string[]; nextCursor: string | null };

const getKey: SWRVInfiniteKeyLoader<Page> = (index, previousPageData) => {
  if (previousPageData && !previousPageData.data.length) {
    return null;
  }

  return `/api/projects?page=${index}`;
};

const { data } = useSWRVInfinite(getKey, fetcher);
```

### `useSWRVSubscription`

Inline subscribe functions can infer the key type too:

```ts
import useSWRVSubscription from "swrv/subscription";
import type { SWRVSubscriptionOptions } from "swrv";

const { data, error } = useSWRVSubscription(
  "key",
  (key, { next }: SWRVSubscriptionOptions<number, Error>) => {
    key satisfies string;
    next(undefined, 1);
    return () => {};
  },
);
```

You can also type the subscribe function itself:

```ts
import useSWRVSubscription from "swrv/subscription";
import type { SWRVSubscription } from "swrv";

const subscribe: SWRVSubscription<string, number, Error> = (key, { next }) => {
  key satisfies string;
  next(undefined, 1);
  return () => {};
};

const { data, error } = useSWRVSubscription("key", subscribe);
```

## Generics

Specifying the data type is easy. In many cases, the fetcher type is enough:

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

`fallbackData` also narrows `data.value` for that composable call:

```ts
const response = useSWRV("/api/user", fetcher, {
  fallbackData: { id: "loading", name: "Loading" },
});

response.data.value.id;
```

If the fetcher comes from `SWRVConfig`, `useSWRV(key, config)` also works:

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

If you want to type a reusable config object, import `SWRVConfiguration` directly:

```ts
import type { SWRVConfiguration } from "swrv";

const config: SWRVConfiguration<string[]> = {
  fallbackData: ["loading"],
  revalidateOnMount: false,
};

const { data } = useSWRV("/api/data", fetcher, config);
```

## Middleware types

There are also extra type definitions you can import for custom middleware and config boundaries:

- `Fetcher`
- `BareFetcher`
- `RawKey`
- `KeySource`
- `SWRVConfiguration`
- `SWRVMiddleware`
- `MutatorOptions`

Most application code can rely on inference and only reach for explicit types at shared fetchers,
composable libraries, or middleware boundaries.

For example:

```ts
import type { SWRVMiddleware } from "swrv";

const swrvMiddleware: SWRVMiddleware = (useSWRVNext) => (key, fetcher, config) => {
  return useSWRVNext(key, fetcher, config);
};
```
