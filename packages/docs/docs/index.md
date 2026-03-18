---
layout: home

hero:
  name: SWRV Next
  text: Vue-native stale-while-revalidate, rebuilt for a modern toolchain
  tagline: SWR-inspired caching, revalidation, mutation, subscription, and infinite loading for Vue applications.
  image:
    src: /mark.svg
    alt: SWRV Next
  actions:
    - theme: brand
      text: Read the Guide
      link: /guide
    - theme: alt
      text: Browse the API
      link: /api

features:
  - title: Provider-Scoped Runtime
    details: Cache state, request dedupe, listeners, and preloads are scoped to a client so SSR and multi-app usage are explicit.
  - title: SWR-Aligned Surface
    details: The project is organized around the same major capability buckets as SWR, while keeping Vue refs and Composition API ergonomics.
  - title: Modern Repo
    details: The monorepo is built around Vite+, Vitest, VitePress, Renovate, and a release flow prepared for npm Trusted Publisher.
---

## Current Status

This repository is being rebuilt from the ground up. The current slice already includes:

- a provider-scoped `swrv` runtime package
- core `useSWRV` support with mutation, subscription, and infinite-loading entry points
- package-local tests for the core runtime behavior
- CI, dependency maintenance, and release scaffolding at the repository level

Use the guide and API reference as the source of truth for the current package surface.
