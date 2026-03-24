---
title: Migrate from v1
description: Required migration changes from swrv v1 to SWRV 2, explained as a simple decision flow.
---

# Migrate from v1

This page covers only the breaking changes that require code changes when moving from `swrv@1.x`
to SWRV 2.

If your app only uses basic `useSWRV(key, fetcher, config)` reads and does not rely on the patterns
below, the dependency switch should be small. Those reads still work, and you do not need a
`<SWRVConfig>` wrapper just to keep existing read calls running.

## Start here

Read the guide as three questions:

1. Do you use `mutate`?
2. Do you rely on removed cache or config APIs?
3. Does your app render on the server?

If the answer is "no" to all three, you likely do not need any code migration beyond the version
switch.

## 1. If you use `mutate`, migrate by intent

This is the most important migration area.

In `swrv@1`, `mutate` was used for several different jobs:

- start a request early and let a later `useSWRV` call consume it
- ask SWRV to fetch again for an existing key
- replace or update cached data

Those jobs sound similar at the call site, but they are different operations:

- **prefetch** means "start a request now so the data is ready earlier"
- **revalidate** means "run the existing fetch logic again for this key"
- **cache write** means "change what is currently stored for this key"

SWRV 2 makes those semantics more explicit. The main rule is:

- use `preload(...)` for **prefetch**
- use `mutate(key)` or bound `mutate()` for **revalidation**
- use `mutate(key, data, options)` or bound `mutate(data, options)` for **cache writes**

### Decision table

| What you mean                                      | v1 shape                                               | SWRV 2 shape                                            |
| -------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| Start a request before a component uses the key    | `mutate(key, promise)`                                 | `preload(key, fetcher)`                                 |
| Fetch the current key again                        | bound `mutate()`                                       | bound `mutate()`                                        |
| Fetch a known key again after some external action | `mutate(key, fetchPromise)` or other revalidation uses | `mutate(key)`                                           |
| Replace or transform cached data                   | mixed into `mutate(...)` usage                         | `mutate(data, options)` or `mutate(key, data, options)` |

### A. If you were using `mutate(key, promise)` to prefetch

That pattern must become `preload(key, fetcher)`.

Before:

```ts
import { mutate } from "swrv";

function prefetchUser() {
  mutate(
    "/api/user",
    fetch("/api/user").then((response) => response.json()),
  );
}
```

After:

```ts
import { preload } from "swrv";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

function prefetchUser() {
  preload("/api/user", fetcher);
}
```

Why this changed:

- a **promise** represents one specific in-flight request
- a **fetcher** represents "how to fetch this key whenever SWRV needs it"
- SWRV 2 moves early request-starting into `preload`, because that is semantically different from
  mutating cached data

Migration steps:

1. Keep the same key.
2. Extract the request logic into a fetcher function if it is not already one.
3. Replace `mutate(key, promise)` with `preload(key, fetcher)`.

### B. If you were using `mutate()` to refetch the current key

That intent stays the same.

```ts
const { mutate } = useSWRV("/api/user", fetcher);

await mutate();
```

Why this still works:

- bound `mutate()` means "revalidate the key already bound to this `useSWRV` call"
- there is no ambiguity because no new data was passed

### C. If you were using `mutate(key, fetchUser())` after a write

That usually means "the remote write finished; now fetch fresh data for this key again."

Before:

```ts
await updateUser(input);
await mutate("/api/user", fetchUser());
```

After:

```ts
import { mutate } from "swrv";

await updateUser(input);
await mutate("/api/user");
```

Why this changed:

- revalidation should describe **which key to fetch again**, not pass a second ad hoc fetch promise
- `mutate(key)` now clearly means "run the existing fetch logic for this key again"

Migration steps:

1. Keep the remote write exactly as it is.
2. Remove the explicit fetch promise from `mutate`.
3. Revalidate by key with `mutate(key)`.

### D. If you were using `mutate(...)` to change cached data

That intent is still valid, but in SWRV 2 it should be expressed as an explicit cache write.

After:

```ts
await mutate((current) => (current ? { ...current, name: "Ada" } : current), {
  revalidate: false,
});
```

Why this matters:

- `mutate()` with no data means **revalidate**
- `mutate(data, options)` means **write data into the cache**
- those are different operations, and SWRV 2 expects the call shape to reflect that difference

Migration steps:

1. Decide whether the old call meant "fetch again" or "change cached data".
2. If it meant "fetch again", use `mutate()` or `mutate(key)`.
3. If it meant "change cached data", pass the next value or updater function, plus options.

## 2. If you rely on removed cache or config APIs

The second migration bucket is old config and cache surface that no longer exists in SWRV 2.

### Quick scan

Search your codebase for:

- `ttl`
- `serverTTL`
- `revalidateDebounce`
- `isDocumentVisible`
- `SWRVCache`
- `swrv/dist/cache`

### A. `ttl` and `serverTTL` are gone

Before:

```ts
useSWRV("/api/user", fetcher, {
  ttl: 60_000,
  serverTTL: 1_000,
});
```

There is no direct rename for either option.

The right replacement depends on what the option was actually doing for you:

- if you were using it as a **refetch policy**, replace that with explicit invalidation through
  [`mutate`](/mutation)
- if you were using it as **storage expiry or persistence**, move that behavior into a custom cache
  provider
- if you were using `serverTTL` as a rough **SSR handoff mechanism**, move that behavior to
  [`fallback`](/global-configuration) or snapshot hydration

The first-principles view is:

- `ttl` and `serverTTL` are cache-lifetime controls
- SWRV 2 does not model cache lifetime as a per-call option anymore
- lifetime and persistence now belong at the provider or SSR handoff layer instead

Migration steps:

1. Delete `ttl` and `serverTTL` from the `useSWRV` config.
2. Decide whether the original reason was refetch policy, storage expiry, or SSR handoff.
3. Move that reason to the right replacement layer instead of trying to rename the option.

### B. `revalidateDebounce` is gone

Before:

```ts
useSWRV("/api/search", fetcher, {
  revalidateDebounce: 200,
});
```

There is no direct replacement.

The first-principles view is:

- SWRV should decide **when to revalidate**
- your component or route state should decide **when the key changes**
- debounce belongs on the thing that drives the key, not inside SWRV config

Migration steps:

1. Delete `revalidateDebounce` from the `useSWRV` config.
2. Move the debounce to the input, watcher, computed source, or route state that changes the key.

### C. `isDocumentVisible` was renamed

Before:

```ts
useSWRV("/api/user", fetcher, {
  isDocumentVisible: () => document.visibilityState === "visible",
});
```

After:

```ts
useSWRV("/api/user", {
  isVisible: () => document.visibilityState === "visible",
});
```

Migration steps:

1. Rename `isDocumentVisible` to `isVisible`.
2. Keep the function body unless you want different visibility logic.

### D. `SWRVCache` and `swrv/dist/cache/*` imports are gone

If you imported:

- `SWRVCache`
- `swrv/dist/cache/adapters/localStorage`
- other `swrv/dist/cache/*` paths

move that logic to the provider model.

Example replacement for persistent storage:

```ts
function localStorageProvider() {
  const map = new Map<string, unknown>(JSON.parse(localStorage.getItem("app-cache") ?? "[]"));

  window.addEventListener("beforeunload", () => {
    localStorage.setItem("app-cache", JSON.stringify(Array.from(map.entries())));
  });

  return map;
}
```

Then provide it:

```vue
<SWRVConfig :value="{ provider: localStorageProvider }">
  <App />
</SWRVConfig>
```

The first-principles view is:

- old `dist/cache/*` imports exposed one concrete cache implementation path
- SWRV 2 wants cache ownership to be explicit at the provider boundary
- persistence is now something you build into the provider instead of importing from an internal
  cache path

Migration steps:

1. Remove the old cache import.
2. Recreate the needed storage behavior as a provider function.
3. Attach that provider through `SWRVConfig`.

See [Cache](/advanced/cache) for the provider API.

## 3. If your app renders on the server

If your app is client-only, skip this section.

If it renders on the server, SWRV 2 no longer starts `useSWRV` fetches during SSR. The server must
fetch the data first and hand it to the client explicitly.

That is the main semantic shift:

- in v1, you may have relied on SWRV usage during server render
- in SWRV 2, SSR data ownership is explicit

### A. If you only need a few known keys

Use config-level `fallback`.

```ts
const article = await getArticle();

const value = {
  fallback: {
    "/api/article": article,
  },
};
```

Migration steps:

1. Fetch the data on the server yourself.
2. Put it in `fallback` under the same SWRV key.
3. Render the app under that config.

### B. If the key is not a simple string

Serialize it first:

```ts
import { unstable_serialize } from "swrv";

const key = ["/api/projects", { page: 1 }] as const;

const value = {
  fallback: {
    [unstable_serialize(key)]: await fetchProjects(),
  },
};
```

Migration steps:

1. Keep the original public key shape.
2. Serialize that key for the `fallback` map.
3. Store the server-fetched result under the serialized key.

### C. If you need to hand off more than a few keys

Use snapshot helpers instead:

- [`serializeSWRVSnapshot`](/server-rendering-and-hydration#snapshot-hydration)
- [`hydrateSWRVSnapshot`](/server-rendering-and-hydration#snapshot-hydration)

Migration steps:

1. Seed a request-scoped SWRV client on the server.
2. Serialize its snapshot.
3. Hydrate a client from that snapshot on the client.

## Final check

Before you call the version switch done, confirm all of the following:

- there are no imports from `swrv/dist/cache/*`
- there are no remaining uses of `ttl`, `serverTTL`, or `revalidateDebounce`
- prefetch code uses [`preload`](/prefetching), not `mutate(key, promise)`
- every `mutate` call was reviewed according to whether it means prefetch, revalidate, or cache
  write
- if the app uses SSR, those paths seed [`fallback`](/global-configuration) or snapshot data
  explicitly

After that, use the rest of the docs as reference material:

- [API](/api)
- [Cache](/advanced/cache)
- [Mutation](/mutation)
- [Prefetching](/prefetching)
- [Server rendering and hydration](/server-rendering-and-hydration)
