---
title: Getting started
description: Install SWRV and start fetching data in Vue.
---

# Getting started

SWRV is stale-while-revalidate data fetching for Vue. It follows SWR closely, but it returns
Vue refs, respects Vue effect scopes, and keeps cache ownership explicit through `SWRVConfig`.

## Installation

Inside your Vue project directory, run:

```bash
npm i swrv vue // [!=npm auto]
```

## Quick start

For normal JSON APIs, start with a small `fetcher` function:

```ts
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("An error occurred while fetching the data.");
  }
  return response.json() as Promise<{ id: string; name: string }>;
};
```

Then call `useSWRV` inside `setup()` or `<script setup>`:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const { data, error, isLoading } = useSWRV("/api/user", fetcher);
</script>

<template>
  <p v-if="error">Failed to load.</p>
  <p v-else-if="isLoading">Loading…</p>
  <p v-else>Hello {{ data?.name }}.</p>
</template>
```

> [!TIP]
> `data`, `error`, `isLoading`, and `isValidating` are Vue refs. In templates you can read them
> directly. In script code, read them through `.value`.

There are usually 3 visible states for a request:

- loading, when the first request is in flight
- ready, when `data` has resolved
- error, when the fetcher throws

SWRV also tracks background revalidation separately through `isValidating`.

## Make it reusable

When the same data appears in multiple parts of the UI, build a composable on top of `useSWRV`:

```ts
import useSWRV from "swrv";

export function useUser(id: string) {
  const response = useSWRV(`/api/users/${id}`, fetcher);

  return {
    user: response.data,
    error: response.error,
    isLoading: response.isLoading,
  };
}
```

Then consume it from any component setup function:

```vue
<script setup lang="ts">
import { useUser } from "../composables/use-user";

const props = defineProps<{ userId: string }>();
const { user, error, isLoading } = useUser(props.userId);
</script>

<template>
  <p v-if="error">Could not load the profile.</p>
  <p v-else-if="isLoading">Loading profile…</p>
  <img v-else :alt="user?.name" :src="user?.avatarUrl" />
</template>
```

This keeps your components declarative. Instead of manually starting requests, tracking pending
state, and pushing results down through props, you describe the data each component needs.

## Example

In a real application, a navbar and a page body often need the same user record. With SWRV, they
can ask for the same key independently:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const value = {
  fetcher: (url: string) => fetch(url).then((response) => response.json()),
};
</script>

<template>
  <SWRVConfig :value="value">
    <Navbar />
    <AccountPage />
  </SWRVConfig>
</template>
```

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const { data: user } = useSWRV("/api/user");
</script>

<template>
  <p>{{ user?.name }}</p>
</template>
```

All consumers of `"/api/user"` inside the same cache boundary share the same cache entry,
deduplicated request, and revalidation behavior.

## Where to go next

- Learn how keys work on [Arguments](/arguments).
- See the full surface on [API](/api).
- Configure shared defaults on [Global configuration](/global-configuration).
- Learn polling, focus, and reconnect behavior on [Revalidation](/revalidation).
