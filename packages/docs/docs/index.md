---
layout: home

hero:
  name: SWRV
  text: Stale-while-revalidate for Vue
  tagline: A Vue-native counterpart to SWR maintained by Kong.
  image:
    alt: SWRV logo
    src: /mark.svg
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: API
      link: /api
    - theme: alt
      text: Migrate from v1
      link: /migrate-from-v1
---

## Installation

```sh
npm i swrv vue // [!=npm auto]
```

## Quick example

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

const { data, error, isLoading } = useSWRV("/api/user", fetcher);
</script>

<template>
  <p v-if="error">Failed to load.</p>
  <p v-else-if="isLoading">Loading…</p>
  <p v-else>Hello {{ data?.name }}</p>
</template>
```
