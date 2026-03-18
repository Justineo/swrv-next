# SWRV Rebuild Roadmap Log

## 2026-03-18

- Re-read `AGENTS.md` and the design snapshot before implementation.
- Started Phase 1 execution by replacing the starter workspace layout with the target `packages/swrv` and `packages/docs` structure.
- Added the first package manifests and root workspace updates so the remaining work can land on the intended monorepo shape.
- Implemented the first `packages/swrv` runtime slice with provider-scoped cache clients, a base hook, global mutate/preload helpers, and subpath exports for immutable, infinite, mutation, and subscription support.
- Added package-local tests covering request dedupe, provider isolation, optimistic mutation, infinite loading, cache population from mutation hooks, and subscription cleanup.
- Added the first VitePress docs site with guide, API, and migration pages.
- Added repository automation scaffolding: CI workflow, release workflow, Renovate config, and root release helper scripts.
- Validated the workspace with `vp run ready`.
- Noted that the docs build currently succeeds with non-fatal VitePress/Rolldown warnings emitted by upstream tooling.
- Started the first Phase 2 runtime hardening slice:
  - fixed `revalidateOnMount` so it only suppresses the initial activation and does not suppress later key changes
  - aligned fallback-data idle behavior with SWR for the disabled-revalidation case
  - tightened focus and reconnect revalidation to respect focus throttling and active document state
  - fixed error retry timers so retries are not canceled by refresh scheduling
  - disabled polling in the immutable entry point by forcing `refreshInterval: 0`
- Expanded the package test suite with SWR-style behavior checks for mount revalidation, focus, reconnect, retry, and immutable polling.
- Revalidated the workspace with `vp run ready`.
