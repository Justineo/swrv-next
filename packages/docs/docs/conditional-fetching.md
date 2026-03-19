# Conditional fetching

SWRV follows SWR's conditional and dependent fetching model.

## Use `null` to stop a request

```ts
const swrv = useSWRV(shouldFetch.value ? "/api/user" : null, fetcher);
```

When the key is `null`, `undefined`, or `false`, SWRV does not start the request.

## Use a function key for dependencies

```ts
const user = useSWRV("/api/user", fetcher);

const projects = useSWRV(
  () => (user.data.value ? `/api/projects?uid=${user.data.value.id}` : null),
  fetcher,
);
```

Function keys are useful when later data depends on earlier data.

## Throw or return a falsy value

If the function key throws or returns a falsy value, SWRV skips the request until the dependencies are ready.

```ts
const projects = useSWRV(() => `/api/projects?uid=${user.data.value!.id}`, fetcher);
```

This pattern works because the key function is re-evaluated reactively.
