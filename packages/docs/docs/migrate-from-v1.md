# Migrate from v1

SWRV 2 is a rewrite, not an incremental patch over the legacy line. Migrate with that assumption.

## What changed structurally

- the repo is now a Vite-era monorepo with separate library and docs packages
- runtime state is scoped by `SWRVConfig` provider boundaries instead of leaning on one global cache
- the public surface follows the same major capability groups as SWR: base hook, immutable, mutation,
  infinite, and subscription
- tests, type coverage, packaging checks, and release automation are now part of the normal delivery path

## Main API changes

- `SWRVConfig` is now the center of cache boundaries, shared fetchers, fallback data, middleware,
  and platform hooks
- `fallback` and snapshot hydration replace the older ad hoc SSR handoff patterns
- `useSWRVInfinite`, `useSWRVMutation`, and `useSWRVSubscription` are maintained first-class
  entry points
- `ttl` remains available, but it is now a compatibility-oriented extension instead of the center
  of cache behavior
- `serverTTL` is not part of the rebuilt core API

## Migration checklist

1. Wrap application boundaries that need shared cache state in `SWRVConfig`.
2. Move imperative write paths to `mutate` or `useSWRVMutation`.
3. Replace legacy pagination helpers with `useSWRVInfinite`.
4. Move SSR initial data to `fallback` or snapshot hydration.
5. Re-check custom cache access code. Provider-scoped helpers are the supported path now.

## Common replacements

| v1 pattern                         | v2 direction                                    |
| ---------------------------------- | ----------------------------------------------- |
| global singleton cache assumptions | explicit `SWRVConfig` boundaries                |
| direct cache writes                | `mutate`, scoped `mutate`, or `useSWRVMutation` |
| bespoke pagination flows           | `useSWRVInfinite`                               |
| server-prefetch-only initial state | `fallback` or snapshot hydration                |
| `serverTTL`-driven SSR behavior    | explicit Vue SSR handoff                        |

## Rollout advice

If your v1 codebase is large, migrate by cache boundary instead of by page. Start with a root
`SWRVConfig`, move shared fetcher logic there, then update mutation and pagination flows one area at
a time. That keeps the migration legible and makes it easier to verify behavior against the new
runtime.
