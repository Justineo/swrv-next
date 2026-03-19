# Mutation and revalidation

SWRV supports both SWR-style cache mutation and dedicated remote mutation hooks.

## Bound mutate

Every `useSWRV` call returns a bound `mutate`.

```ts
const swrv = useSWRV("/api/user", fetcher);

await swrv.mutate((current) => ({ ...current, name: "Grace" }), {
  optimisticData: (current) => ({ ...current, name: "Grace" }),
  rollbackOnError: true,
});
```

Calling `mutate()` with no arguments revalidates the current key.

## Global mutate

Use the root export or `useSWRVConfig().mutate`.

```ts
import { mutate } from "swrv";

await mutate("/api/user", nextUser, {
  populateCache: true,
  revalidate: false,
});
```

You can also target multiple keys with a filter function.

## Mutation options

Important options:

- `optimisticData`
- `populateCache`
- `rollbackOnError`
- `throwOnError`
- `revalidate`

## useSWRVMutation

Use `swrv/mutation` for imperative remote writes with dedicated mutation state.

```ts
import useSWRVMutation from "swrv/mutation";

const { data, error, isMutating, reset, trigger } = useSWRVMutation(
  "/api/user",
  async (key, { arg }: { arg: { name: string } }) => {
    const response = await fetch(key, {
      body: JSON.stringify(arg),
      method: "PATCH",
    });
    return response.json();
  },
);
```

`trigger(arg, options?)` supports the same optimistic and cache-population options as `mutate`.

## Revalidation after mutation

Mutations can:

- write directly to the cache
- skip cache updates
- revalidate after the write
- leave revalidation off

That makes it possible to model optimistic updates, server-authoritative writes, and local-only cache changes.
