# Status

## Current Line

The rebuilt project is currently aligned to the prerelease line:

- package version line: `2.0.0-next.x`
- npm dist-tag: `next`
- intended first stable line: `2.x`

The active non-suspense parity lane is closed for the current cut. What remains
is mostly documentation and stable-release closure, not missing core runtime
infrastructure.

## Shipped In The Current `2.0` Cut

- provider-scoped cache and revalidation runtime
- `useSWRV` with Vue refs for `data`, `error`, `isLoading`, and `isValidating`
- global and bound `mutate`
- global and scoped `preload`
- `swrv/immutable`
- `swrv/infinite`
- `swrv/mutation`
- `swrv/subscription`
- `SWRVConfig`, `useSWRVConfig`, `createSWRVClient`, and SSR snapshot helpers
- browser e2e coverage, compile-time API coverage, and package export coverage
- release automation, Renovate, and Trusted Publisher-compatible publish flow

## Matches SWR Closely

- mount, focus, reconnect, refresh, dedupe, retry, and mutate-driven revalidation behavior
- middleware composition across the base hook and companion hooks
- config-level `fallback` support and provider-style cache boundaries
- `infinite`, `mutation`, and `subscription` as first-class entry points
- `unstable_serialize`, preload reuse, scoped mutate, and cache-isolation semantics

## Intentionally Vue-Native

- hook state is exposed as Vue refs instead of React state snapshots
- config is commonly supplied through `SWRVConfig`
- cache boundaries map cleanly to Vue app and SSR request boundaries
- tuple keys are typed as positional fetcher arguments instead of a single tuple parameter
- hooks are designed for `setup()` or an active Vue effect scope

## Still Intentionally Different From SWR

- the supported SSR contract is explicit client scoping plus fallback or hydrated snapshots, not a larger framework-integrated server-components story
- `ttl` remains available as a compatibility-oriented extension
- `serverTTL` is intentionally not part of the rebuilt core API
- the built-in devtools surface is a lightweight middleware hook, not a React-extension-equivalent toolchain

## Deferred From The Active Lane

- suspense parity
  The feasibility notes are in `journey/research/2026-03-19-vue-suspense-feasibility.md`.
- deeper framework adapters such as Nuxt-specific integration
- any post-`2.0` ergonomic helpers that are not required for the current parity and release target

## Where SWR Still Leads

- React-specific suspense integration and the broader React rendering model around it
- ecosystem maturity from longer public use and wider community coverage
- framework-specific integrations that sit on top of the core runtime rather than inside it

## Where The Rebuild Already Exceeds Legacy SWRV

- provider-scoped runtime instead of module-level singleton assumptions
- modern monorepo, docs, CI, release, and dependency-maintenance tooling
- broader public API surface and stronger compile-time coverage
- much wider behavior coverage and browser-facing tests

## Support Policy

- Vue: `>=3.2.26 <4`
- TypeScript: `>=5.5`
- prereleases stay on `next` until the first stable `2.x` release is intentionally cut
