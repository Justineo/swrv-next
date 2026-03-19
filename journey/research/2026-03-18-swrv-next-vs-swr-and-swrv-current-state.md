# Current State Analysis: `swrv-next` vs `swr` and `swrv`

Date: 2026-03-18

## Purpose

This document answers a narrower question than the earlier baseline study in [journey/research/swr-vs-swrv.md](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/journey/research/swr-vs-swrv.md): after the rebuild work already completed in `swrv-next`, where does the project stand now relative to upstream `swr` and legacy `swrv`?

The goal is not to restate the original gap analysis. The goal is to measure how much of that gap has already been closed, what remains materially different, and what those differences mean for release readiness.

## Comparison Baseline

The analysis below is based on these local sources:

- `swrv-next`: `/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next`
- `swr`: `/Users/yiling.gu@konghq.com/Developer/Justineo/swr`
- legacy `swrv`: `/Users/yiling.gu@konghq.com/Developer/Kong/swrv`

Reference versions at the time of analysis:

- `swrv-next`: `2.0.0-next.0`
- `swr`: `2.4.1`
- legacy `swrv`: `1.1.0`

## Executive Summary

The simplest accurate description is:

- `swrv-next` is now much closer to `swr` than to legacy `swrv` in architecture, package shape, testing strategy, release posture, and long-term maintainability.
- `swrv-next` is not yet as broad or mature as `swr`; the remaining difference is mostly breadth, edge-case depth, and ecosystem integration rather than the core design direction.
- Compared with legacy `swrv`, `swrv-next` is effectively a new generation of the project rather than a light modernization pass.

The original `swr` vs `swrv` study identified three major layers of misalignment: release surface, API semantics, and implementation model. `swrv-next` has already closed a large share of all three:

- release surface: modern monorepo, modern docs, CI, release automation, Renovate, typed export map
- API semantics: dedicated `immutable`, `infinite`, `mutation`, and `subscription` entry points now exist and are behavior-tested
- implementation model: provider-scoped runtime state replaces the old singleton-heavy model, bringing it much closer to SWR's cache-domain architecture

What remains open is narrower:

- SWR still has wider behavior coverage and more edge-case depth
- React-specific capabilities such as `react-server` exports and Suspense/streaming SSR have no direct Vue equivalent in `swrv-next`
- `swrv-next` still carries a compatibility-oriented `ttl` concept that does not belong to SWR core semantics
- SSR guidance is practical but intentionally narrower than SWR's broader framework ecosystem story

## Quantitative Snapshot

These counts are not a quality score, but they are a good proxy for scope and maturity.

| Area                               |                                       `swrv-next` |                                                                           `swr` |         legacy `swrv` |
| ---------------------------------- | ------------------------------------------------: | ------------------------------------------------------------------------------: | --------------------: |
| library source files               |                                                17 |                                                                              41 |                     7 |
| test files                         |                                                 3 |                                                                              52 |                     7 |
| e2e files                          |                                                 4 |                                                      included in test/e2e setup |                     0 |
| docs files under project docs site |                                                 8 |                                   much broader external site and docs ecosystem |                    12 |
| package subpath entry points       | 6 public/library entry points plus `package.json` | 6 public/library entry points plus `package.json`, with `react-server` variants | essentially root-only |

Interpretation:

- `swrv-next` has already moved far beyond legacy `swrv` in package structure and runtime scope.
- `swrv-next` still has materially less breadth than `swr`, especially in test surface and internal specialization.

## `swrv-next` vs `swr`

### 1. Package Shape and Public Surface

This is one of the clearest areas of convergence.

`swr` publishes:

- root API
- `infinite`
- `immutable`
- `mutation`
- `subscription`
- `_internal`
- `react-server` variants for several subpaths

`swrv-next` now publishes:

- root API
- `infinite`
- `immutable`
- `mutation`
- `subscription`
- `_internal`

That means the package is now organized like a real SWR counterpart rather than like a small Vue wrapper with a single main entry point. This is a major break from legacy `swrv`.

Where `swr` still leads:

- CommonJS plus ESM plus richer conditional export branches
- `react-server` export variants
- a larger internal module split behind the public API

What this means:

- on package topology, `swrv-next` is on the right track
- on ecosystem breadth, `swr` is still the more mature library

### 2. Runtime Architecture

This is the most important structural shift.

`swr` is built around cache-provider-scoped runtime state. The cache domain is not just storage; it also carries dedupe state, listeners, broadcasting, and race coordination.

Legacy `swrv` was much more cache-object-centric. It exposed TTL directly and historically leaned on long-lived module-level cache state, which made SSR isolation and behavior parity with SWR harder.

`swrv-next` now follows SWR's architectural direction much more closely:

- explicit cache/client boundaries
- provider-scoped runtime state
- explicit global and scoped mutate paths
- dedupe and revalidation coordinated through the runtime rather than a bare cache container

This is a decisive improvement. It closes one of the deepest gaps identified in the original research.

Where `swr` still leads:

- more mature internal layering
- more battle-tested race and edge-state handling across a wider set of scenarios
- server/runtime specialization that reflects the React ecosystem more deeply

### 3. API and Behavioral Alignment

This is the other major area of progress.

The old gap was that SWR had first-class APIs for infinite loading, mutation, and subscription, while legacy SWRV essentially centered on `useSWRV` and `mutate`.

`swrv-next` has now closed most of that product gap:

- `useSWRV`
- `useSWRVImmutable`
- `useSWRVInfinite`
- `useSWRVMutation`
- `useSWRVSubscription`
- global `mutate`
- global `preload`
- `unstable_serialize`
- middleware support through `use`
- config-level `fallback`

The base revalidation semantics are also much closer to SWR than old SWRV:

- `revalidateOnMount` only affects initial activation
- fallback data can stay idle when revalidation is disabled
- focus and reconnect revalidation are visibility/online/throttle-aware
- `isPaused()` participates in revalidation gating
- no-arg bound `mutate()` revalidates rather than mutating to `undefined`
- preload dedupes and is consumed by the first matching hook fetch

The advanced APIs are now real rather than aspirational:

- `infinite` has aggregate/page cache coordination, `setSize()`, page revalidation control, and `unstable_serialize` behavior coverage
- `mutation` models optimistic update and callback behavior much more like SWR
- `subscription` handles fallback retention, key switching, and cache-boundary dedupe

Where `swr` still leads:

- broader edge-case parity coverage, especially across advanced mutation and infinite scenarios
- features that are specific to the React runtime model, such as Suspense-oriented behavior and server-component exports
- larger accumulated behavior surface validated directly from upstream tests

### 4. Typing Quality

This is another area where `swrv-next` has moved far away from legacy `swrv`.

Relative to `swr`, `swrv-next` now has:

- dedicated public type exports
- compile-time coverage for root and subpath APIs
- stronger tuple-key inference
- better mutation trigger typing
- better infinite mutator typing when mutation payloads differ from cached page-array shape
- better subscription key narrowing

Relative to legacy `swrv`, this is a major leap.

Relative to `swr`, the remaining gap is not that `swrv-next` types are obviously rough. The remaining gap is:

- fewer years of ecosystem hardening
- fewer type tests
- fewer niche overloads and React-specific type paths

In other words, type quality is no longer a major architectural weakness. It is now an area of continued hardening.

### 5. Testing and Validation

This is where the maturity difference is most visible.

`swr` still has a much broader testing surface:

- 52 files under `test`
- rich unit, behavior, type, build, and e2e coverage
- broader SSR, mutation, cache, suspense, and streaming scenarios

`swrv-next` now has a modern and credible validation stack:

- Vitest-based library tests
- compile-time type coverage
- Playwright e2e fixture app
- package export smoke test
- repo-level readiness command validated through `vp run ready`
- package pack and publish dry-runs

That is a major upgrade from legacy `swrv`, but it is still not the same breadth as `swr`.

The current position is:

- `swrv-next` is publishable and maintainable
- `swr` is still more deeply exercised

### 6. Docs, Tooling, and Release Engineering

This is another area where `swrv-next` has already crossed the old gap.

Compared with legacy `swrv`, the rebuild has already modernized almost everything:

- Vite+ workspace instead of Yarn 1 plus Vue CLI era tooling
- modern docs site in `packages/site`
- CI and release workflows
- Renovate
- contributor and security docs
- npm publish dry-run path aligned with Trusted Publisher provenance flow

Compared with `swr`, `swrv-next` is now in the same category of serious open-source package maintenance, even if it is not yet as extensive:

- both have modular package surfaces
- both have explicit testing and release automation
- both have documentation and policy scaffolding

Where `swr` still leads:

- larger and more established contributor-facing repo surface
- deeper release/testing matrix
- broader ecosystem maturity around its framework and platform variants

### 7. Remaining Differences That Matter

These are the remaining differences that still matter strategically:

1. `swrv-next` is aligned to SWR, but not yet equivalent in breadth.
   The current delta is mostly edge-case coverage and maturity, not core architecture.

2. `swrv-next` intentionally remains Vue-native.
   Returned state is `Ref`-based, configuration is expressed through Vue composition and `SWRVConfig`, and runtime boundaries map naturally to Vue app/SSR structure.

3. `ttl` remains in `swrv-next`.
   This is useful for migration and compatibility, but it is still a deliberate semantic difference from SWR core.

4. SSR scope is practical but intentionally narrower.
   `swrv-next` supports explicit client scoping plus config-level `fallback`, but it does not yet try to match the breadth of SWR's surrounding Next.js and React server ecosystem story.

5. React-specific features should not be treated as parity blockers.
   `react-server` exports and Suspense-specific behavior reflect React platform needs, not missing diligence in a Vue port.

## `swrv-next` vs legacy `swrv`

### 1. Architectural Direction

This is not a small refactor. It is a real architectural reset.

Legacy `swrv` was:

- centered around `useSWRV` and `mutate`
- relatively small in source scope
- strongly shaped by TTL and cache-container concerns
- historically exposed to singleton-style SSR risks

`swrv-next` is:

- provider-scoped
- modular
- behavior-oriented
- release-engineered like a modern library
- designed to track SWR intentionally rather than only borrowing its name and high-level idea

The most accurate framing is that `swrv-next` is a rebuild of the project line, not a cosmetic refresh of the old one.

### 2. Public API

Legacy `swrv` exported a much smaller surface:

- default `useSWRV`
- `mutate`
- `SWRVCache`
- `IConfig`

`swrv-next` now exports a family of dedicated entry points and richer types:

- base hook plus immutable/infinite/mutation/subscription variants
- config and cache/client helpers
- public mutate/preload helpers
- `_internal` entry point
- `unstable_serialize`

This is a major shift in API philosophy:

- old `swrv`: minimal API plus custom user composition
- `swrv-next`: official first-class capability modules closer to SWR

### 3. Type System

Legacy `swrv` types were workable but coarse. Important behaviors were either loosely represented or absent altogether.

`swrv-next` is much stricter:

- explicit declaration coverage
- public type tests
- stronger inference for tuple keys and mutations
- more exact subpath API typing

This is one of the largest quality jumps in the rebuild.

### 4. Testing Posture

Legacy `swrv` had a small test surface and an older stack.

`swrv-next` now has:

- focused parity tests
- e2e browser coverage
- package export smoke tests
- dedicated type tests

This means the project is no longer relying mainly on manual confidence or a narrow unit suite. It now has the beginnings of a real compatibility and regression-defense strategy.

### 5. Tooling and Maintenance

This is the starkest difference outside the runtime itself.

Legacy `swrv` is still rooted in:

- Yarn 1
- Vue CLI
- webpack 4
- Jest-era testing
- older TypeScript
- minimal workflow automation

`swrv-next` is built around:

- Vite+ workspace orchestration
- modern package builds
- modern docs stack
- modern CI/release automation
- Renovate-based maintenance
- explicit journey memory for future agents

This is exactly the kind of repo posture needed for long-term maintainability.

### 6. Compatibility and Intentional Breaks

`swrv-next` is not trying to preserve every legacy trait.

Notable carryovers or compatibility choices:

- `ttl` remains, because it is a meaningful migration affordance and an established legacy behavior
- Vue support remains on the same major line, `>=3.2.26 <4`

Notable breaks:

- `serverTTL` is gone from the rebuilt core API
- runtime state is no longer modeled around the old module-level cache expectations
- API surface is larger, more structured, and more opinionated

This is the right tradeoff. Preserving every old assumption would have kept the project misaligned with SWR and held back the redesign.

## Side-by-Side Interpretation

| Dimension           | `swrv-next` vs `swr`                | `swrv-next` vs legacy `swrv`               |
| ------------------- | ----------------------------------- | ------------------------------------------ |
| overall direction   | same direction, less mature         | fundamentally different generation         |
| package shape       | strongly converged                  | dramatically expanded                      |
| runtime model       | much closer                         | structurally replaced                      |
| API family          | mostly aligned in shape             | far broader                                |
| type quality        | credible, still maturing            | major improvement                          |
| test strategy       | modern but smaller                  | much stronger                              |
| tooling             | comparable class, smaller scope     | completely modernized                      |
| release engineering | credible prerelease line            | essentially new                            |
| SSR story           | narrower than SWR ecosystem         | far safer and more explicit than old model |
| key remaining gaps  | breadth, edge semantics, docs depth | mostly migration and compatibility choices |

## What This Means for "Where We Stand Now"

The project is no longer in the "can this be rebuilt?" phase. It is in the "how complete and launch-ready should the first public cut be?" phase.

That matters because it changes how the remaining work should be evaluated:

- the biggest decisions left are about closure, breadth, and release policy
- the biggest risks left are about parity completeness and ecosystem readiness, not foundational architecture
- the core design direction should now be considered proven

A concise status judgment:

- compared with `swr`, `swrv-next` is a serious Vue-native counterpart with the right architecture and public surface, but not yet equal in depth and long-tail maturity
- compared with legacy `swrv`, `swrv-next` has already achieved the rebuild goal in architecture, tooling, typing, testing strategy, and repo maintainability

## Practical Conclusion

If the benchmark is "is `swrv-next` still basically old SWRV with nicer tooling?", the answer is no.

If the benchmark is "is `swrv-next` already directionally equivalent to SWR, but expressed in Vue-native terms?", the answer is yes.

If the benchmark is "has `swrv-next` fully matched SWR's total breadth, edge semantics, and ecosystem maturity?", the answer is not yet.

The current standing is therefore:

- architecturally: close to SWR
- operationally: far ahead of legacy SWRV
- in breadth and maturity: still behind SWR
- in project trajectory: on the right line for a real `2.x` reboot
