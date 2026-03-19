# Pagination

SWRV supports both simple page-index fetching and full infinite loading.

## Start with useSWRV when possible

If your UI only needs a single page at a time, a normal key is enough.

```ts
const pageIndex = ref(0);

const swrv = useSWRV(
  () => ["/api/projects", pageIndex.value] as const,
  async (url, page) => {
    const response = await fetch(`${url}?page=${page}`);
    return response.json();
  },
);
```

## Use useSWRVInfinite for page lists

```ts
import useSWRVInfinite from "swrv/infinite";

const swrv = useSWRVInfinite(
  (index, previousPage) => {
    if (previousPage && !previousPage.nextCursor) {
      return null;
    }

    return ["/api/projects", previousPage?.nextCursor ?? null] as const;
  },
  async (url, cursor) => {
    const response = await fetch(`${url}?cursor=${cursor ?? ""}`);
    return response.json();
  },
);
```

Returned values:

- `data`
- `error`
- `isLoading`
- `isValidating`
- `mutate`
- `size`
- `setSize`

## Important options

- `initialSize`
- `parallel`
- `persistSize`
- `revalidateAll`
- `revalidateFirstPage`
- `compare`

## setSize

`setSize` grows or shrinks the number of requested pages.

```ts
await swrv.setSize((current) => current + 1);
```

## Mutate an infinite key

`useSWRVInfinite` exposes a bound `mutate` for the aggregate page array, and it also exports `unstable_serialize` for targeted cache work.

```ts
import { unstable_serialize } from "swrv/infinite";

const key = unstable_serialize(getKey);
```
