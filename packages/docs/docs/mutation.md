---
title: Mutation
description: Mutate cached data and perform remote writes with SWRV.
---

# Mutation

SWRV supports both SWR-style cache mutation and dedicated remote mutation hooks.

> [!TIP]
> Hook snippets on this page assume they are called inside `setup()` or `<script setup>`.

## `mutate`

You can mutate through the bound `mutate` returned by `useSWRV`, or through the scoped or global
`mutate` helper.

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const user = useSWRV("/api/user", fetcher);

async function rename() {
  await user.mutate((current) => (current ? { ...current, name: "Grace" } : current), {
    optimisticData: (current) => (current ? { ...current, name: "Grace" } : current),
    rollbackOnError: true,
  });
}
</script>
```

Calling `mutate()` with no arguments revalidates the current key.

### API

```ts
await mutate(key, data?, options?);
```

Important options:

- `optimisticData`
- `populateCache`
- `rollbackOnError`
- `throwOnError`
- `revalidate`

## `useSWRVMutation`

Use `swrv/mutation` for imperative writes with dedicated mutation state.

### API

```ts
const { data, error, isMutating, reset, trigger } = useSWRVMutation(key, fetcher, options);
```

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
  await trigger({ name });
}
</script>
```

### Defer loading data until needed

`useSWRVMutation` is also useful when the remote action should not run at mount time:

```ts
const exportReport = useSWRVMutation("/api/report/export", async (key) => {
  const response = await fetch(key, { method: "POST" });
  return response.json() as Promise<{ downloadUrl: string }>;
});

void exportReport.trigger();
```

## Optimistic updates

Use `optimisticData` when the UI should update immediately:

```ts
await mutate("/api/user", updateUserOnServer(newName), {
  optimisticData: (current) => (current ? { ...current, name: newName } : current),
  rollbackOnError: true,
});
```

## Rollback on errors

`rollbackOnError` restores the previous cache value if the mutation fails:

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

## Avoid race conditions

SWRV tracks fetch and mutation ordering so late request responses do not overwrite newer mutation
results. This is especially important when a mutation and a background revalidation overlap.

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

Use this sparingly. It is powerful, but broad mutation filters are harder to reason about than
targeting one specific key.
