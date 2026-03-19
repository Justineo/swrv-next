---
layout: home

hero:
  name: SWRV
  text: A Vue library for data fetching
  tagline: With swrv, components will get a stream of data updates constantly and automatically. The UI will always be fast and reactive.
  image:
    alt: SWRV logo
    src: https://docs-swrv.netlify.app/logo_45.png
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
npm i swrv // [!=npm auto]
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
