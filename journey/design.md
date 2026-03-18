# SWRV Next Design Snapshot

Status: Baseline plus first core parity hardening pass
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
- The docs package now builds with VitePress and includes a first guide, API overview, and migration page.
- Repository maintenance scaffolding now exists for CI, Renovate, and release publishing.
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

## Planned Repository Shape

- `packages/swrv`: published library package
- `packages/docs`: VitePress docs site
- `journey/`: project memory and planning artifacts

## Early Decisions To Resolve

- Versioning strategy for the rebuilt release: continue the `1.x` line or treat the rewrite as a breaking `2.0`-style release
- Supported Vue floor and supported TypeScript floor
- Whether TTL/serverTTL remain first-class core APIs, move behind an extension layer, or become compatibility utilities
- The exact SSR/Nuxt support contract and hydration story
- How far the current `infinite`, `mutation`, and `subscription` implementations need to evolve to reach the desired SWR parity line
- Whether to replace any VitePress build-path warnings once Vite+ or VitePress upstream behavior changes
