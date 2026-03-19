# SWR docs copy alignment

## Goal

Bring the SWRV docs copy and examples materially closer to the upstream SWR docs source tree while
preserving Vue-native usage rules.

## Completed

- Reworked the main guide pages to mirror SWR's section flow and example intent more closely:
  - `getting-started`
  - `conditional-fetching`
  - `mutation`
  - `pagination`
  - `prefetching`
  - `subscription`
  - `typescript`
- Expanded the remaining thinner reference and advanced pages where SWR still led on guide flow:
  - `middleware`
  - `revalidation`
  - `advanced/cache`
  - `server-rendering-and-hydration`
- Kept SWRV-specific differences explicit instead of copying React-only assumptions:
  - composable usage stays inside `setup()` or `<script setup>` when the sample is a real component
  - tuple-key fetchers remain shown with SWRV's spread argument semantics
  - SSR docs now follow SWR's client-fetching / pre-rendered fallback progression, but clearly note
    that SWRV does not do hook-driven server fetches or React Server Component promise handoff

## Validation

- `vp check --fix`
- `vp test`
- `vp run site#build`

## Follow-up policy

- For pages that overlap with SWR, keep reusing SWR's structure, section naming, and example intent
  unless Vue semantics or intentional SWRV differences require a change.
