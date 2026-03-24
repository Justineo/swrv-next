# Docs Vue semantics pass

Date: 2026-03-24
Status: complete

## Summary

Rewrote React-shaped wording in the documentation so the docs consistently describe SWRV in
Vue-native terms.

## What changed

- replaced generic `hook` / `hooks` wording with Vue-specific language such as:
  - composable
  - `useSWRV` call
  - component using `useSWRV`
  - per-call configuration
- updated the API, configuration, middleware, mutation, prefetching, SSR, cache, TypeScript, and
  migration pages to avoid React-shaped lifecycle phrasing where Vue wording is clearer
- kept technical meaning intact while changing terminology, especially around:
  - middleware composition
  - prefetch consumption
  - cache-provider scope
  - SSR data handoff
  - mutation semantics

## Validation

- `vp check`
- `vp run build -r`
