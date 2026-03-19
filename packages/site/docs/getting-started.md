---
title: Getting started
description: Install SWRV and start fetching data in Vue.
---

# Getting started

SWRV is a Vue library for data fetching. It follows SWR closely, but it returns Vue refs and is
meant to be used inside `setup()` or `<script setup>`.

## Installation

Inside your Vue project directory, run the following:

```bash
npm i swrv // [!=npm auto]
```

## Quick start

For normal RESTful APIs with JSON data, first create a `fetcher` function. It is usually just a
wrapper around the native `fetch`:

```ts
const fetcher = (url: string) => fetch(url).then((response) => response.json());
```

> [!TIP]
> If you want to use GraphQL APIs or libraries such as Axios, you can create your own fetcher
> function. See [Data fetching](/data-fetching) for more examples.

Then import `useSWRV` and start using it inside `setup()` or `<script setup>`:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const props = defineProps<{ userId: string }>();

const { data, error, isLoading } = useSWRV(`/api/user/${props.userId}`, fetcher);
</script>

<template>
  <p v-if="error">Failed to load.</p>
  <p v-else-if="isLoading">Loading...</p>
  <p v-else>Hello {{ data?.name }}!</p>
</template>
```

Normally, there are 3 possible states of a request: "loading", "ready", or "error". You can use
the values of `data`, `error`, and `isLoading` to determine the current state of the request and
return the corresponding UI.

## Make it reusable

When building an app, you often need to reuse the same data in many places of the UI. It is very
easy to create reusable data composables on top of `useSWRV`:

```ts
import useSWRV from "swrv";

export function useUser(id: string) {
  const { data, error, isLoading } = useSWRV(`/api/user/${id}`, fetcher);

  return {
    user: data,
    isLoading,
    isError: error,
  };
}
```

And use it in your components:

```vue
<script setup lang="ts">
import { useUser } from "../composables/use-user";

const props = defineProps<{ userId: string }>();
const { user, isLoading, isError } = useUser(props.userId);
</script>

<template>
  <p v-if="isLoading">Loading...</p>
  <p v-else-if="isError">Failed to load profile.</p>
  <img v-else :alt="user?.name" :src="user?.avatar" />
</template>
```

By adopting this pattern, you can forget about fetching data in the imperative way: start the
request, update loading state, and pass the final result down through props. Instead, your code is
more declarative: each component just describes what data it needs.

## Example

In a real app, a navbar and the page content often both depend on the same `user` record.

```vue
<!-- Page.vue -->
<script setup lang="ts">
const props = defineProps<{ userId: string }>();
</script>

<template>
  <Navbar :user-id="props.userId" />
  <Content :user-id="props.userId" />
</template>
```

```vue
<!-- Content.vue -->
<script setup lang="ts">
import { useUser } from "../composables/use-user";

const props = defineProps<{ userId: string }>();
const { user, isLoading } = useUser(props.userId);
</script>

<template>
  <p v-if="isLoading">Loading...</p>
  <h1 v-else>Welcome back, {{ user?.name }}</h1>
</template>
```

```vue
<!-- Navbar.vue -->
<script setup lang="ts">
import { useUser } from "../composables/use-user";

const props = defineProps<{ userId: string }>();
const { user, isLoading } = useUser(props.userId);
</script>

<template>
  <p v-if="isLoading">Loading...</p>
  <img v-else :alt="user?.name" :src="user?.avatar" />
</template>
```

Data is now bound to the components that need it, and the parent components do not need to know
anything about fetching or passing data around. The code is simpler and easier to maintain.

The best part is that there will still be only one request sent to the API, because the components
use the same SWRV key. The request is deduped, cached, and shared automatically.

The app also gains automatic [revalidation](/revalidation) on focus or reconnect, so the user
record can refresh when the browser tab becomes active again or the network comes back.

## Where to go next

- Learn how keys work on [Arguments](/arguments).
- See the full surface on [API](/api).
- Configure shared defaults on [Global configuration](/global-configuration).
- Learn polling, focus, and reconnect behavior on [Revalidation](/revalidation).
