# Remaining Phases And Tasks

Date: 2026-03-18
Status: Active planning snapshot

## Context

The original rebuild roadmap is still valid at a high level, but most of the foundation work is already complete:

- monorepo reshape is done
- runtime core exists
- core and advanced public APIs exist
- type, browser, and package validation are in place
- docs, CI, Renovate, and release scaffolding exist

What remains now is not another broad platform phase. It is a narrower release-candidate sequence focused on parity closure, SSR policy, docs quality, and launch execution.

## Remaining Phase 1: Infinite Parity Closure

Objective:

- finish the highest-risk remaining SWR parity area: `swrv/infinite`

Tasks:

- port more SWR infinite tests around bound `mutate()` option behavior:
  - `optimisticData`
  - functional `optimisticData`
  - functional `populateCache`
  - `populateCache: false`
  - `rollbackOnError`
  - `throwOnError`
- verify multi-page mutation behavior, especially when aggregate infinite cache and page caches diverge
- verify `revalidate: true` and `revalidate: false` object-option behavior on bound infinite mutate
- verify sequential vs parallel request behavior, including error ordering in parallel mode
- verify fallback and seeded-cache behavior across growth, revalidation, and local mutation

Exit criteria:

- the most important SWR infinite behavior cases have direct SWRV tests
- no known aggregate/page cache sync bug remains

## Remaining Phase 2: Mutation And Subscription Parity Sweep

Objective:

- close the remaining advanced-API behavior gaps outside `infinite`

Tasks:

- port more SWR mutation-hook tests for:
  - callback timing
  - `onSuccess` and `onError`
  - `throwOnError` interactions
  - optional/no-arg trigger cases
  - cache-sharing behavior with normal `useSWRV`
- port more subscription tests for:
  - dynamic key changes
  - undefined/null key behavior
  - singleton/deduped subscription behavior
  - cleanup and disposer lifecycle edge cases
- audit whether any config-callback freshness behavior is still missing compared with SWR

Exit criteria:

- `mutation` and `subscription` no longer have obvious uncovered SWR behavior domains

## Remaining Phase 3: SSR And Hydration Decision Closure

Objective:

- decide whether first stable release keeps the current SSR contract or grows a dedicated helper surface

Tasks:

- choose one of:
  - keep the current explicit client plus `fallback` model for `2.0`
  - add a small hydration helper surface before `2.0`
  - add deeper Nuxt-facing guidance or utilities before `2.0`
- if helpers are added:
  - design the public API
  - add runtime and docs coverage
- if helpers are deferred:
  - document the deferral explicitly in parity and SSR docs

Exit criteria:

- SSR expectations for first stable release are explicit and documented

## Remaining Phase 4: Docs And Reference Hardening

Objective:

- move docs from “working” to “reference-quality”

Tasks:

- finish API reference completeness across all subpaths and key options
- add examples for advanced infinite, mutation, and subscription flows
- tighten migration guidance from legacy SWRV and from SWR mental models
- document current parity status precisely:
  - what matches SWR
  - what is intentionally Vue-native
  - what is deferred past first stable
- verify docs examples stay aligned with real package behavior

Exit criteria:

- docs can support a real prerelease without requiring readers to inspect source

## Remaining Phase 5: Release Candidate Closure

Objective:

- convert the current “launch-ready codebase” into an actual release candidate process

Tasks:

- decide exact prerelease/stable version sequence for the rewritten line
- do one more packed-artifact audit:
  - exports
  - declarations
  - README/LICENSE/package metadata
- validate the GitHub release and npm Trusted Publisher path with the real target repository/package settings
- define stable release checklist:
  - required tests
  - required docs pages
  - release notes expectations
  - support policy statement

Exit criteria:

- there is no repo-side blocker left between the current main branch and a real prerelease cut

## Remaining Phase 6: Post-2.0 Candidates

These are likely follow-up items rather than blockers for the first stable line:

- deeper Nuxt integrations
- dedicated hydration helpers if deferred
- additional type-level precision beyond the current public overloads
- further compatibility/migration utilities for legacy SWRV users
- any optional runtime features that are useful but not core to SWR parity

## Recommended Order From Here

1. Finish `infinite` parity closure.
2. Sweep `mutation` and `subscription`.
3. Freeze the SSR/hydration scope for `2.0`.
4. Harden docs around the frozen scope.
5. Do the final release-candidate closure pass.

## Practical Task Queue

Immediate tasks:

- port the remaining high-value SWR infinite mutate-option tests
- verify multi-page optimistic/populate/rollback flows in `swrv/infinite`
- port missing mutation/subscription parity tests after the infinite pass

Near-term tasks:

- finalize the first stable SSR scope
- tighten API/parity/migration docs
- dry-run the real release checklist

Final tasks before prerelease/stable:

- complete release notes and versioning decisions
- validate pack/publish path one last time
- cut prerelease from the validated branch
