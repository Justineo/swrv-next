---
title: Pagination
description: Paginate data with useSWRV or useSWRVInfinite.
---

# Pagination

SWRV supports both simple paginated views and full infinite loading.

## When to use `useSWRV`

If the UI only needs one page at a time, a normal key is enough.

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

### Infinite loading

You can also use plain `useSWRV` for a hidden “next page” request, but that pattern gets awkward as
soon as you need shared page state, page-specific revalidation, or cursor-based loading.

### Advanced cases

Once the page count itself becomes part of the state, `useSWRVInfinite` is the better fit.

## `useSWRVInfinite`

```ts
const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRVInfinite(
  getKey,
  fetcher,
  options,
);
```

### API

- `getKey(index, previousPageData)`: returns the key for a page, or `null` to stop loading
- `fetcher`: receives the resolved page key and returns the page data
- `size`: the current number of requested pages
- `setSize(next)`: grow or shrink the page count
- `mutate(data?, options?)`: mutate the aggregate page array

### Example 1: index-based paginated API

```vue
<script setup lang="ts">
import { computed } from "vue";
import useSWRVInfinite from "swrv/infinite";

type Page = { items: { id: string; name: string }[] };

const response = useSWRVInfinite<Page>(
  (index) => ["/api/projects", index + 1] as const,
  async (url, page) => {
    const result = await fetch(`${url}?page=${page}`);
    return result.json();
  },
);

const items = computed(() => response.data.value?.flatMap((page) => page.items) ?? []);
</script>
```

### Example 2: cursor or offset based paginated API

```vue
<script setup lang="ts">
import useSWRVInfinite from "swrv/infinite";

type Page = {
  items: { id: string; name: string }[];
  nextCursor: string | null;
};

const response = useSWRVInfinite<Page>(
  (index, previousPage) => {
    if (index > 0 && !previousPage?.nextCursor) {
      return null;
    }

    return ["/api/projects", previousPage?.nextCursor ?? ""] as const;
  },
  async (url, cursor) => {
    const result = await fetch(`${url}?cursor=${cursor}`);
    return result.json();
  },
);
</script>
```

### Parallel fetching mode

Set `parallel: true` when page requests do not depend on each other:

```ts
useSWRVInfinite(getKey, fetcher, {
  parallel: true,
});
```

### Revalidate specific pages

`mutate` can revalidate selectively:

```ts
await response.mutate(response.data.value, {
  revalidate: (_pageData, [_url, page]) => page === 1,
});
```

### Global mutate with `useSWRVInfinite`

For aggregate cache operations, use the infinite `unstable_serialize` helper:

```ts
import { mutate } from "swrv";
import { unstable_serialize } from "swrv/infinite";

await mutate(unstable_serialize(getKey));
```

### Advanced features

High-value options include:

- `initialSize`
- `parallel`
- `persistSize`
- `revalidateAll`
- `revalidateFirstPage`
- `compare`

See [Prefetching](/prefetching) for preloading page requests and [Mutation](/mutation) for
optimistic updates against infinite data.
