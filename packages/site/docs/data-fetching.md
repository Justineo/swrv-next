---
title: Data fetching
description: Fetch data with SWRV using custom fetcher functions.
---

# Data fetching

```ts
const { data, error } = useSWRV(key, fetcher);
```

This is the core contract of SWRV. The fetcher receives the key and returns the data. If it throws,
the error is exposed through `error`.

> [!TIP]
> The fetcher can be omitted from the hook call if it is provided globally through
> [`SWRVConfig`](/global-configuration).

## Fetch

You can use the platform `fetch` API directly:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Request failed.");
  }
  return response.json();
};

const { data, error } = useSWRV("/api/data", fetcher);
</script>
```

If your app always uses the same request shape, move the fetcher to `SWRVConfig` and keep the hook
calls shorter:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const value = {
  fetcher: (url: string) => fetch(url).then((response) => response.json()),
};
</script>

<template>
  <SWRVConfig :value="value">
    <App />
  </SWRVConfig>
</template>
```

Now any nested `useSWRV("/api/data")` call can omit the positional fetcher.

## Axios

SWRV works with Axios the same way:

```vue
<script setup lang="ts">
import axios from "axios";
import useSWRV from "swrv";

const fetcher = (url: string) => axios.get(url).then((response) => response.data);
const { data, error } = useSWRV("/api/data", fetcher);
</script>
```

## GraphQL

GraphQL clients work as long as the fetcher returns the data:

```vue
<script setup lang="ts">
import { request } from "graphql-request";
import useSWRV from "swrv";

const query = `
  query Movie {
    movie(title: "Inception") {
      releaseDate
      actors {
        name
      }
    }
  }
`;

const fetcher = (document: string) => request("/api/graphql", document);
const { data, error } = useSWRV(query, fetcher);
</script>
```

If you need query variables, use tuple or object keys so the request arguments and cache key stay
aligned. See [Arguments](/arguments).
