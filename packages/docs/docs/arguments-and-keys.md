# Arguments and keys

Keys identify cached data in SWRV. A key is both the cache identifier and the value that will be passed into the fetcher.

## String keys

```ts
useSWRV("/api/user", fetcher);
```

This is the simplest form. The fetcher receives the same string.

## Tuple keys

Use tuples when the fetcher needs multiple arguments.

```ts
useSWRV(["/api/user", token.value] as const, async (url, token) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
});
```

Tuple keys are the right choice when any part of the fetch input should also affect the cache key.

## Object keys

Objects are also valid keys.

```ts
useSWRV({ path: "/api/user", locale: locale.value }, async (key) => {
  const response = await fetch(`${key.path}?locale=${key.locale}`);
  return response.json();
});
```

SWRV serializes object keys with the same stable hash it uses for cache lookup.

## Function keys

Use a function key when the request depends on another piece of data or should only run conditionally.

```ts
useSWRV(() => (user.value ? `/api/projects?uid=${user.value.id}` : null), fetcher);
```

If the function returns a falsy key or throws, SWRV does not start the request.

## Ref and computed keys

Keys can be refs or computed refs.

```ts
const key = computed(() => `/api/user/${route.params.id}`);
const swrv = useSWRV(key, fetcher);
```

When the ref changes, SWRV treats it the same as a key change in SWR.

## Mutate and serialize against the same key

Use the original key when calling `mutate`.

```ts
await mutate(["/api/user", token.value], nextUser);
```

Use `unstable_serialize` only when you need the internal serialized form, such as config `fallback` maps or advanced infinite-cache coordination.
