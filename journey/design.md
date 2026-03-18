# SWRV Next Design Snapshot

Status: Runtime parity plus repo-side launch readiness
Last updated: 2026-03-18

## Mission

Rebuild SWRV as a modern, well-maintained, Vue-native counterpart to SWR. The new project should treat SWR 2.4.1 as the primary behavioral and API reference, while expressing the result as idiomatic Vue composables and SSR-safe runtime primitives instead of a literal React port.

## Current State

- The repository now uses the intended monorepo shape:
  - `packages/swrv`
  - `packages/docs`
- The root workspace is validated through `vp check`, `vp test`, and `vp run build -r`.
- The `swrv` package now contains an initial provider-scoped runtime with:
  - `useSWRV`
  - `SWRVConfig`
  - `useSWRVConfig`
  - global `mutate`
  - global `preload`
  - `swrv/immutable`
  - `swrv/infinite`
  - `swrv/mutation`
  - `swrv/subscription`
- The base hook behavior has started to move closer to SWR semantics:
  - `revalidateOnMount` now only affects the initial activation, not later key changes
  - fallback data stays idle when revalidation is disabled
  - focus and reconnect revalidation now respect focus throttling and visibility/online state
  - error retries now survive refresh scheduling instead of being cleared immediately
  - the immutable entry point now disables polling by forcing `refreshInterval: 0`
  - `isPaused()` now gates mount, focus, reconnect, polling, and mutate-driven revalidation, and in-flight results are discarded while paused
  - bound `mutate()` now correctly treats a no-argument call as revalidation instead of mutating the cache to `undefined`
  - config-level `onSuccess` and `onError` callbacks now exist for base requests
  - config-level `isVisible()` and `isOnline()` overrides now participate in focus, reconnect, and active-state gating
  - config-level `onErrorRetry`, `onLoadingSlow`, and `onDiscarded` now exist for retry scheduling, slow-request signaling, and stale-response races
  - the request path now holds onto the exact in-flight promise instead of re-reading it through the dedupe window, which fixes `dedupingInterval: 0` flakiness
  - request and mutation ordering now use high-resolution timestamps, which avoids false stale-response discards when revalidation starts immediately after a mutation
- The infinite and mutation helpers have also moved closer to SWR:
  - `swrv/infinite` now exposes `unstable_serialize`, resolves page keys safely, supports cursor-style sequential loading, and treats `setSize()` as a page-oriented operation instead of a raw aggregate refresh
  - `swrv/infinite` now revalidates the first page while loading new pages and lets no-arg `mutate()` revalidate all loaded pages
  - `swrv/infinite` now respects `revalidateFirstPage: false` while growing, uses cached data first in `setSize()`, and supports page-selective revalidation callbacks through bound `mutate(data, { revalidate })`
  - `swrv/mutation` now guards local state against stale trigger results after `reset()` or a newer trigger
  - scoped `mutate()` now returns the actual mutation result even when `populateCache` is disabled
- The subscription helper has now received its first real parity pass:
  - `swrv/subscription` preserves fallback and last good data across subscription errors
  - it passes original keys through to handlers, deduplicates subscriptions per cache boundary, and enforces disposer return values
  - it no longer conflicts with normal `useSWRV` state for the same logical key
- Public typing and package-shape coverage are now materially stronger:
  - `useSWRV` and `useSWRVImmutable` now infer array-key fetcher arguments more precisely
  - public compile-time coverage exists for root and subpath APIs
  - the package export map now points at the emitted `.d.mts` declaration files and is checked by a package-export smoke test
- The docs package now builds with VitePress and includes a first guide, API overview, and migration page.
- The docs package now also includes examples, a current-scope page, and an explicit SSR guide built around provider-scoped clients plus config-level fallback data.
- Repository maintenance scaffolding now exists for CI, Renovate, and release publishing.
- The package publish surface is now materially closer to launch-ready:
  - config-level `fallback` data is supported and stays visible during initial revalidation
  - nested `SWRVConfig` boundaries merge fallback maps in SWR-style order
  - `SWRVConfig` now also supports the SWR-style functional `value` form, which receives the parent config but replaces parent overrides with its returned object
  - SWR-style `use` middleware composition now works across `useSWRV`, `immutable`, `infinite`, `mutation`, and `subscription`
  - the published package includes explicit typed subpath exports, a package README, and an Apache-2.0 license file
  - root contributor and security guidance now exist for repository users and maintainers
- The main reference materials for the rebuild remain:
  - `journey/research/swr-vs-swrv.md`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr` (local SWR source, version 2.4.1)
  - `/Users/yiling.gu@konghq.com/Developer/Kong/swrv` (local legacy SWRV source, version 1.1.0)

## Observed Gaps

- SWR is modular and export-oriented, with `infinite`, `mutation`, `subscription`, `immutable`, `/_internal`, provider-scoped runtime state, and broad behavior/type/e2e coverage.
- Legacy SWRV is centered on `useSWRV` and `mutate`, uses module-level singleton caches, exposes TTL/serverTTL directly, and has a much smaller runtime, test, and type surface.
- Legacy SWRV tooling and workflows are outdated: Yarn 1, Vue CLI, webpack 4, Jest, older TypeScript, and a minimal CI pipeline.

## Working Decisions

- Use SWR behavior, tests, and source organization as the default compatibility target. Treat the old SWRV codebase mainly as migration context and a source of Vue-specific lessons, not as the authoritative design.
- Rebuild the runtime around cache/provider-scoped state instead of module singletons so cache isolation, deduplication, listeners, and SSR request boundaries are explicit.
- Keep the public API as close to SWR as practical, but preserve a Vue-native reactive contract for returned state and composition.
- Treat types, automated tests, docs, CI/CD, release automation, and dependency maintenance as first-class project scope, not cleanup work after the runtime is complete.
- Keep project memory current in `journey/design.md`, use `journey/plans/` for milestone or phase plans, and use `journey/logs/` for implementation notes and dead ends.
- Use plain VitePress scripts for docs builds inside `packages/docs`, but continue to drive workspace orchestration through `vp run ...`.
- Keep the library build on stable declaration generation for now instead of the experimental `tsgo` path.
- Treat explicit client scoping plus config-level `fallback` as the supported SSR path for the current cut. Deeper Nuxt integration and dedicated hydration helpers can remain follow-up work.
- Keep publish automation on the `next` dist-tag until the final version line is explicitly chosen.

## Planned Repository Shape

- `packages/swrv`: published library package
- `packages/docs`: VitePress docs site
- `journey/`: project memory and planning artifacts

## Early Decisions To Resolve

- Versioning strategy for the rebuilt release: continue the `1.x` line or treat the rewrite as a breaking `2.0`-style release
- Supported Vue floor and supported TypeScript floor
- Whether TTL/serverTTL remain first-class core APIs, move behind an extension layer, or become compatibility utilities
- How much dedicated Nuxt or hydration helper surface should exist beyond the current explicit client plus `fallback` contract
- How far the current `infinite`, `mutation`, and `subscription` implementations still need to evolve to reach the desired SWR parity line
- Whether the current infinite revalidation policy is enough, or if page-selective revalidation options need to get even closer to SWR's `revalidate` callback behavior
- How much additional type-level precision is worth adding beyond the current public overloads before the API surface is frozen
- Whether to replace any VitePress build-path warnings once Vite+ or VitePress upstream behavior changes
