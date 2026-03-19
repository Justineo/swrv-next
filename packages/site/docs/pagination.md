---
title: Pagination
description: Paginate data with useSWRV or useSWRVInfinite.
---

# Pagination

SWRV supports common UI patterns such as pagination and infinite loading.

## When to use `useSWRV`

First of all, you might not need `useSWRVInfinite`. If you are building a typical paginated UI that
shows one page at a time, plain `useSWRV` is usually enough.

### Pagination

```vue
<script setup lang="ts">
import { ref } from "vue";
import useSWRV from "swrv";

const pageIndex = ref(0);

const { data, isLoading } = useSWRV(
  () => ["/api/projects", pageIndex.value] as const,
  async (url, page) => {
    const response = await fetch(`${url}?page=${page}`);
    return response.json() as Promise<{ items: { id: string; name: string }[] }>;
  },
);
</script>
```

This is the simplest path when the screen renders exactly one page at a time.

You can also extract a reusable page component:

```vue
<!-- Page.vue -->
<script setup lang="ts">
import useSWRV from "swrv";

const props = defineProps<{ index: number }>();

const { data } = useSWRV(`/api/data?page=${props.index}`, fetcher);
</script>
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ref } from "vue";

const pageIndex = ref(0);
</script>

<template>
  <Page :index="pageIndex" />
  <button @click="pageIndex -= 1">Previous</button>
  <button @click="pageIndex += 1">Next</button>
</template>
```

Because of SWRV's cache, you can even preload the next page by rendering it in a hidden container:

```vue
<template>
  <Page :index="pageIndex" />
  <div style="display: none">
    <Page :index="pageIndex + 1" />
  </div>
</template>
```

### Infinite loading

For a basic "load more" UI, you can still use the `Page` abstraction and render a dynamic number of
page components:

```vue
<script setup lang="ts">
import { ref } from "vue";

const count = ref(1);
</script>

<template>
  <Page v-for="index in count" :key="index" :index="index - 1" />
  <button @click="count += 1">Load more</button>
</template>
```

This keeps the `useSWRV` call inside each page component's setup scope. That is the Vue-friendly
way to scale the number of requests without trying to create a changing number of composable calls
from a single component.

### Advanced cases

However, that pattern stops working well in more advanced cases. For example:

- the top-level UI needs data from every page to compute totals
- the API is cursor based, so each page depends on the previous page

That is where `useSWRVInfinite` helps.

## `useSWRVInfinite`

```ts
const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRVInfinite(
  getKey,
  fetcher,
  options,
);
```

Similar to `useSWRV`, this composable accepts a function that returns the request key, a fetcher,
and options. It returns everything `useSWRV` returns, plus `size` and `setSize`.

In infinite loading, one page is one request, and the goal is to fetch multiple pages and render
them together.

### API

#### Parameters

- `getKey(index, previousPageData)`: returns the key for a page, or `null` to stop loading
- `fetcher`: same as `useSWRV`'s fetcher
- `options`: accepts all `useSWRV` options, plus:
  - `initialSize = 1`
  - `revalidateAll = false`
  - `revalidateFirstPage = true`
  - `persistSize = false`
  - `parallel = false`

> [!NOTE]
> `initialSize` should be treated as fixed for the lifecycle of that hook call.

#### Return values

- `data`: an array of page responses
- `size`: the number of pages that should be fetched
- `setSize`: updates the number of pages that should be fetched
- `error`, `isLoading`, `isValidating`, and `mutate`: the same core values you get from `useSWRV`,
  but applied to the page array

### Example 1: index-based paginated API

```ts
import { computed } from "vue";
import useSWRVInfinite from "swrv/infinite";

type User = { id: string; name: string };

const getKey = (pageIndex: number, previousPageData?: User[]) => {
  if (previousPageData && !previousPageData.length) {
    return null;
  }

  return `/users?page=${pageIndex}&limit=10`;
};

const response = useSWRVInfinite(getKey, fetcher);
const { data, size, setSize } = response;
```

`data` is an array of page responses:

```ts
// `data.value` will look like:
[
  [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ],
  [
    { id: "3", name: "Cathy" },
    { id: "4", name: "David" },
  ],
];
```

That means the top-level component can now compute totals across every loaded page:

```ts
const totalUsers = computed(() => data.value?.reduce((count, page) => count + page.length, 0) ?? 0);
```

That is the main difference from the earlier `<Page />` pattern: the top-level component has access
to every loaded page at once.

### Example 2: cursor or offset based paginated API

```ts
import useSWRVInfinite from "swrv/infinite";

type Page = {
  data: { id: string; name: string }[];
  nextCursor: string | null;
};

const getKey = (pageIndex: number, previousPageData?: Page) => {
  if (previousPageData && !previousPageData.data.length) {
    return null;
  }

  if (pageIndex === 0) {
    return "/users?limit=10";
  }

  return `/users?cursor=${previousPageData?.nextCursor}&limit=10`;
};

const { data, size, setSize } = useSWRVInfinite(getKey, fetcher);
```

### Parallel fetching mode

Set `parallel: true` when page requests do not depend on each other:

```ts
useSWRVInfinite(getKey, fetcher, {
  parallel: true,
});
```

When `parallel` is enabled, `previousPageData` is always `undefined` because pages are no longer
loaded sequentially.

### Revalidate specific pages

`mutate` can revalidate selectively:

```ts
await response.mutate(response.data.value, {
  revalidate: (_pageData, [_url, page]) => page === 1,
});
```

The `revalidate` callback runs for each loaded page, so it is the right place to decide whether one
specific page should refetch.

### Global mutate with `useSWRVInfinite`

For aggregate cache operations, use the infinite `unstable_serialize` helper:

```ts
import { mutate } from "swrv";
import { unstable_serialize } from "swrv/infinite";

await mutate(unstable_serialize(getKey));
```

That targets the aggregate infinite key. If you need to revalidate or mutate individual pages,
prefer the bound `mutate` returned from `useSWRVInfinite`.

> [!WARNING]
> As the name implies, `unstable_serialize` is not a stable API and may change in a future release.

### Advanced features

`useSWRVInfinite` is flexible enough to power:

- loading states
- empty-list states
- disabling "Load more" when the end is reached
- changing data sources
- refreshing the whole list

High-value options include:

- `initialSize`
- `parallel`
- `persistSize`
- `revalidateAll`
- `revalidateFirstPage`
- `compare`

`initialSize` controls how many pages are fetched initially, `persistSize` keeps the current page
count when the first page key changes, `revalidateAll` forces every page to revalidate, and
`revalidateFirstPage` controls whether page 1 should revalidate when loading more pages.

See [Prefetching](/prefetching) for preloading page requests and [Mutation](/mutation) for
optimistic updates against infinite data.
