---
title: Mutation
description: Mutate cached data and perform remote writes with SWRV.
---

# Mutation

SWRV provides the [`mutate`](/mutation#mutate) and [`useSWRVMutation`](/mutation#useswrvmutation)
APIs for mutating remote data and the related cache.

> [!TIP]
> Hook snippets on this page assume they are called inside `setup()` or `<script setup>`.

## `mutate`

There are 2 ways to use `mutate`: the global mutate API which can mutate any key, and the bound
mutate API which only mutates the data for the current key.

### Global mutate

The recommended way to get the scoped or global mutator is to use `useSWRVConfig()`:

```ts
import { useSWRVConfig } from "swrv";

const { mutate } = useSWRVConfig();

await mutate(key, data, options);
```

You can also import it globally:

```ts
import { mutate } from "swrv";

await mutate(key, data, options);
```

> [!WARNING]
> Using global `mutate(key)` with only the key parameter will not update the cache unless there is
> a mounted SWRV hook using the same key. It is a revalidation signal, not a write by itself.

### Bound mutate

Bound mutate is the short path for mutating the current key with data. It behaves like the global
mutate function, but the key is already bound to the `useSWRV` call.

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const { data, mutate } = useSWRV("/api/user", fetcher);

async function uppercaseName() {
  if (!data.value) {
    return;
  }

  const newName = data.value.name.toUpperCase();
  await requestUpdateUsername(newName);
  await mutate({ ...data.value, name: newName });
}
</script>
```

### Revalidation

When you call `mutate(key)` or bound `mutate()` without any data, it triggers a revalidation for the
resource:

```vue
<script setup lang="ts">
import { useSWRVConfig } from "swrv";

const { mutate } = useSWRVConfig();

function logout() {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  void mutate("/api/user");
}
</script>
```

This is useful after auth changes, remote invalidations, or any action where the cache should be
refetched rather than directly replaced.

It broadcasts to hooks under the same [cache provider](/advanced/cache) scope. If you are using a
custom provider boundary, prefer the scoped `mutate` from `useSWRVConfig()` so you mutate the cache
that the current hooks are actually using.

### API

```ts
await mutate(key, data?, options?);
```

#### Parameters

- `key`: same as `useSWRV`'s `key`, but a function behaves as a filter function
- `data`: data to update the client cache, or an async function for the remote mutation
- `options`: accepts the following options:
  - `optimisticData`: data to write immediately, or a function that derives optimistic data from
    the current cached value
  - `revalidate = true`: whether SWRV should revalidate after the mutation resolves
  - `populateCache = true`: whether the resolved mutation result should be written to the cache, or
    a function that merges the mutation result with the current cached value
  - `rollbackOnError = true`: whether optimistic data should be rolled back when the remote
    mutation fails
  - `throwOnError = true`: whether the mutate call should rethrow the error

#### Return values

`mutate` returns the resolved value of the `data` parameter. If an error is thrown while executing
the mutation, the error is rethrown unless `throwOnError` is disabled.

## `useSWRVMutation`

SWRV also provides `useSWRVMutation` as a composable for remote mutations. Remote mutations are
triggered manually instead of automatically like `useSWRV`.

This composable does not share local state with other `useSWRVMutation` calls, but it does share
the same cache store as `useSWRV`.

### API

```ts
const { data, error, isMutating, reset, trigger } = useSWRVMutation(key, fetcher, options);
```

#### Parameters

- `key`: same as `mutate`'s `key`
- `fetcher(key, { arg })`: an async function for remote mutation
- `options`: an optional object with properties such as:
  - `optimisticData`: same as `mutate`'s `optimisticData`
  - `revalidate = true`: same as `mutate`'s `revalidate`
  - `populateCache = false`: same as `mutate`'s `populateCache`, but defaulting to `false`
  - `rollbackOnError = true`: same as `mutate`'s `rollbackOnError`
  - `throwOnError = true`: same as `mutate`'s `throwOnError`
  - `onSuccess(data, key, config)`
  - `onError(error, key, config)`

#### Return values

- `data`: data for the given key returned from the fetcher
- `error`: error thrown by the fetcher
- `trigger(arg, options)`: a function to trigger a remote mutation
- `reset`: resets `data`, `error`, and `isMutating`
- `isMutating`: whether there is an ongoing remote mutation

`trigger` also accepts per-call options so you can override optimistic updates or rollback behavior
for one mutation without changing the base hook configuration.

It returns the remote mutation result when the request succeeds.

### Basic usage

```vue
<script setup lang="ts">
import useSWRVMutation from "swrv/mutation";

const { trigger, isMutating, error } = useSWRVMutation(
  "/api/user",
  async (key, { arg }: { arg: { name: string } }) => {
    const response = await fetch(key, {
      body: JSON.stringify(arg),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    return response.json() as Promise<{ id: string; name: string }>;
  },
);

async function submit(name: string) {
  try {
    const updatedUser = await trigger({ name });
    console.log(updatedUser);
  } catch {
    // handle the error here
  }
}
</script>
```

You can also override options at trigger time:

```ts
await trigger(
  { name: "Ada" },
  {
    optimisticData: (current) => (current ? { ...current, name: "Ada" } : current),
    rollbackOnError: true,
  },
);
```

### Defer loading data until needed

You can also use `useSWRVMutation` for loading data. It does not start requesting until `trigger`
is called:

```vue
<script setup lang="ts">
import { ref } from "vue";
import useSWRVMutation from "swrv/mutation";

const show = ref(false);
const { data: user, trigger } = useSWRVMutation("/api/user", (url) =>
  fetch(url).then((response) => response.json()),
);

async function showUser() {
  await trigger();
  show.value = true;
}
</script>
```

That makes it useful for modal-driven or user-triggered flows where loading should not start at
mount time.

## Optimistic updates

`useSWRVMutation` also supports the same optimistic update and rollback features as `mutate`:

```ts
await mutate("/api/user", updateUserOnServer(newName), {
  optimisticData: (current) => (current ? { ...current, name: newName } : current),
  rollbackOnError: true,
});
```

## Rollback on errors

`rollbackOnError` restores the previous cache value if the remote mutation fails:

```ts
await mutate("/api/user", failingRequest(), {
  optimisticData: { id: "1", name: "Grace" },
  rollbackOnError: true,
});
```

## Update cache after mutation

Use `populateCache` to decide what should be written back:

```ts
await mutate("/api/user", patchUser(), {
  populateCache: (result, current) => ({ ...current, ...result }),
  revalidate: false,
});
```

Set `populateCache: false` when the mutation response should not replace the cache.

The same pattern works with `useSWRVMutation`:

```ts
useSWRVMutation("/api/todos", updateTodo, {
  populateCache: (updatedTodo, todos) => {
    const filteredTodos = todos.filter((todo) => todo.id !== "1");
    return [...filteredTodos, updatedTodo];
  },
  revalidate: false,
});
```

## Avoid race conditions

Both `mutate` and `useSWRVMutation` coordinate with `useSWRV` so late request responses do not
overwrite newer mutation results. This is especially important when a mutation and a background
revalidation overlap.

## Mutate based on current data

Mutation callbacks receive the current cached value:

```ts
await mutate("/api/todos", (current) => {
  return current?.map((todo) => (todo.id === "1" ? { ...todo, done: true } : todo));
});
```

## Mutate multiple items

Use a filter function to target multiple keys:

```ts
import { mutate } from "swrv";

await mutate((key) => typeof key === "string" && key.startsWith("/api/todos?"), undefined, {
  revalidate: true,
});
```

This also works with other key shapes:

```ts
await mutate((key) => Array.isArray(key) && key[0] === "item", undefined, {
  revalidate: false,
});
```

Use this sparingly. The filter runs against every existing cache key, so the safest filters guard
the key shape before reading from it.
