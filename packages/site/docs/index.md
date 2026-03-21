---
layout: home

hero:
  name: SWRV
  text: A Vue library for data fetching
  tagline: With SWRV, components will get a stream of data updates constantly and automatically. The UI will always be fast and reactive.
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
features:
  - title: Feature-rich Data Fetching
    details: Transport and protocol agnostic data fetching, revalidation on focus, polling, in-flight de-duplication.
  - title: Vue Composition API
    details: Start developing with power of Vue 3, using the reactivity system of the Vue Composition API.
  - title: Stale-while-revalidate
    details: Uses cache to serve pages fast, while revalidating data sources producing an eventually consistent UI.
---

## Installation

```sh
npm i swrv // [!=npm auto]
```

## Quick example

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const { data, error, isLoading } = useSWRV("/api/user", fetcher);
</script>

<template>
  <p v-if="error">Failed to load.</p>
  <p v-else-if="isLoading">Loading…</p>
  <p v-else>Hello {{ data?.name }}</p>
</template>
```

<section class="home-credit">
  <p class="credit-kicker">Based on</p>
  <div class="credit-logos">
    <a class="credit-link credit-link-swr" href="https://swr.vercel.app/">
      <img alt="SWR" height="69" src="/swr-logo.svg" width="291" />
      <span>SWR</span>
    </a>
    <span class="credit-separator">from</span>
    <a aria-label="Vercel" class="credit-link credit-link-vercel" href="https://vercel.com/">
      <img alt="Vercel" height="52" src="/vercel-wordmark.svg" width="262" />
    </a>
  </div>
  <p class="credit-copy">
    Built to match SWR closely while staying idiomatic to Vue.
  </p>
</section>
