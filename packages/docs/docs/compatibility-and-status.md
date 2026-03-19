# Compatibility and status

This page describes what the current line already ships, what is intentionally different, and what remains deferred.

## Shipped in the current line

- SWR-aligned base-hook semantics for dedupe, fallback data, revalidation, and mutate
- `swrv/immutable`
- `swrv/infinite`
- `swrv/mutation`
- `swrv/subscription`
- provider-scoped cache boundaries
- config-level `fallback`
- SSR snapshot serialization and hydration helpers
- browser tests, type tests, pack dry-runs, and publish dry-runs

## Intentionally different from SWR

- returned state is Vue refs, not React render-state values
- SWR's React-only dependency collection is not ported into Vue
- `ttl` remains available as a compatibility-oriented extension
- the SSR page is Vue-first rather than Next.js-specific

## Deferred from the active lane

- `suspense`
- Nuxt-specific integrations
- deeper framework adapters outside the current explicit SSR contract

## Status of the stable release work

Before the stable cut, the active work is:

- refining the public and internal types
- simplifying the codebase one more time
- replacing the temporary docs with this full rewrite
- rebuilding the docs site design

The package already validates through the normal build, test, pack, and publish dry-run paths.
