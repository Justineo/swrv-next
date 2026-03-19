# Migration from SWRV

This rewrite is not a light patch over the legacy project. Treat it as a new major line.

## What changed structurally

- the repo is now a Vite-era monorepo
- cache state is provider-scoped instead of being built around global singletons
- the project is organized around the same major capability groups as SWR
- the public type surface is much tighter than the legacy package

## Main API differences from legacy SWRV

- `SWRVConfig` is now central to cache boundaries, shared fetchers, fallback data, and middleware
- `mutation`, `subscription`, and `infinite` are first-class maintained entry points
- config `fallback` and snapshot hydration are the preferred SSR handoff tools
- `serverTTL` is not restored in the rebuilt core API
- `ttl` still exists, but as a compatibility-oriented extension rather than the center of the cache model

## Practical migration advice

1. Replace any assumption of one global cache with an explicit `SWRVConfig` boundary.
2. Move ad-hoc write flows to `mutate` or `useSWRVMutation`.
3. Replace legacy pagination helpers with `useSWRVInfinite`.
4. Move SSR initial data to config `fallback` or snapshot hydration.
5. Re-check any legacy cache writing code. Direct cache mutation is still not the recommended path.
