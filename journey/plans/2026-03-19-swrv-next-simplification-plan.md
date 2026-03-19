# SWRV Next Simplification Plan

Date: 2026-03-19
Status: Active

## Current Progress

- Phase 1 safe structural extraction is complete.
- Phase 2 client or provider-state migration is complete for the base runtime facade.
- Phase 3 public entry and handler split is complete.
- Phase 4 advanced API simplification is still open.
- Phase 5 optional feature isolation is still open.

## Goal

Reduce accidental internal complexity in `swrv-next` while preserving:

- current public API
- current behavioral parity
- current test coverage
- current SSR contract

The simplification target is architectural shape, not feature removal.

## Principles

1. Preserve behavior first.
2. Simplify abstractions before rewriting algorithms.
3. Move closer to SWR’s core module ideas where React-specific constraints do not matter.
4. Keep Vue-native semantics where they are genuinely required.
5. Treat the current test matrix as a non-regression gate.

## Success Criteria

- The base runtime depends on fewer custom concepts.
- Advanced APIs depend on shared helpers instead of bespoke client methods.
- `config.ts` and `use-swrv.ts` have clearer single responsibilities.
- The public API remains source-compatible.
- `vp check` and `vp test` stay green throughout.

## Simplification Workstreams

### 1. Replace `SWRVClient` with thinner provider-state helpers

Objective:

- reduce the custom service-object layer

Changes:

- introduce a `provider-state` module that binds provider-scoped maps to a cache
- move fetch lanes, mutation timestamps, preloads, subscribers, and revalidators into that state
- replace wide client methods with a smaller helper vocabulary

Expected payoff:

- less internal API surface
- fewer cross-module dependencies
- easier reasoning about where state actually lives

Risk:

- medium, because the base hook and advanced APIs all depend on the current client

### 2. Split config responsibilities

Objective:

- make config composition and provider setup easier to reason about

Changes:

- split current `config.ts` into:
  - defaults or web preset
  - config merge
  - context/provider setup
  - public accessor helpers

Expected payoff:

- simpler module boundaries
- lower coupling between defaults, provider lifecycle, and public accessors

Risk:

- low

### 3. Separate public hook entry resolution from runtime handler

Objective:

- reduce the conceptual load of `use-swrv.ts`

Changes:

- introduce a `withArgs`-style entry wrapper
- move public overloads and normalization into a thin entry module
- move the actual hook runtime to a handler-focused module

Expected payoff:

- easier runtime maintenance
- easier type-surface maintenance
- clearer similarity to SWR’s structure

Risk:

- medium, because this touches the main hook boundary

### 4. Rebuild advanced APIs on narrower shared helpers

Objective:

- stop each advanced API from inventing its own internal storage shape where possible

Changes:

- make `infinite`, `subscription`, and `mutation` depend on:
  - provider state
  - cache helper
  - shared key-prefix helpers
  - bound mutate
- remove direct dependence on a rich client object

Expected payoff:

- smaller conceptual surface
- better consistency across modules

Risk:

- medium

### 5. Isolate optional features from the hot path

Objective:

- keep correctness features while reducing core-path branching

Changes:

- review whether TTL can be pushed behind a cache-policy helper
- keep devtools integration outside the main request logic
- keep SSR warnings outside the core fetch lifecycle where possible

Expected payoff:

- simpler base hook internals

Risk:

- low to medium

## Recommended Sequencing

### Phase 1: Safe structural extraction

Do first:

- split `config.ts`
- add `provider-state` and `cache-helper` modules alongside the existing client
- introduce shared key-prefix helpers for `$inf$` and `$sub$`

Why first:

- low-risk groundwork
- creates the abstraction targets before behavior changes

### Phase 2: Dual-path migration off `SWRVClient`

Do second:

- refactor `use-swrv.ts` internals to consume the new helper layer
- keep a temporary compatibility adapter from the old client shape if needed

Why second:

- this is the highest-value simplification
- it should happen before refactoring advanced APIs so they can build on the new primitives

### Phase 3: Public entry and handler split

Do third:

- extract argument resolution and middleware application into a thin entry wrapper
- move the heavy runtime into `use-swrv-handler.ts`

Why third:

- after provider-state simplification, the handler split becomes much cleaner

### Phase 4: Advanced API simplification

Do fourth:

- refactor `infinite`
- refactor `subscription`
- refactor `mutation` where useful

Why fourth:

- advanced APIs should target the simplified primitives, not the old ones

### Phase 5: Optional feature isolation

Do last:

- TTL path cleanup
- SSR-warning cleanup
- devtools-path cleanup

Why last:

- these are optimization passes, not architectural blockers

## Concrete Candidate Refactors

### Candidate A: Introduce `getProviderState(cache)`

Replace:

- `createSWRVClient()`
- wide `SWRVClient` method calls

With:

- `getProviderState(cache)`
- thin helper functions that accept `cache` and `providerState`

### Candidate B: Introduce `createCacheHelper(cache, key)`

Use it for:

- base-hook state reads and writes
- subscription cache updates
- infinite aggregate and page-cache synchronization
- SSR snapshot reads

### Candidate C: Introduce `withArgs(useSWRVHandler)`

Make the public `useSWRV` entrypoint mostly responsible for:

- current config lookup
- argument normalization
- middleware application

and nothing else.

### Candidate D: Collapse helper-identity caches into provider state

Replace separate `WeakMap` stores for:

- scoped mutate
- scoped preload

with provider-state-owned bound helpers.

## Guardrails

- Do not change public exports or call forms during the simplification pass.
- Do not weaken the current type surface.
- Do not remove tests while simplifying.
- Do not combine simplification with new feature work.
- Keep each step behavior-preserving and commit-sized.

## Validation Strategy

For every phase:

- run `vp check`
- run `vp test`

For behavior-sensitive phases:

- run targeted domain tests first
- then full `vp test`

For high-risk refactors of the base hook:

- use the upstream test matrix as a checklist
- confirm no regression in:
  - focus and reconnect
  - polling
  - mutate races
  - fallback and SSR
  - cache-bound isolation

## Priorities

Highest-value:

1. thin provider-state layer replacing `SWRVClient`
2. split `use-swrv.ts` into entry and handler
3. split `config.ts` by responsibility

Second-tier:

4. advanced API cleanup on top of shared helpers
5. optional feature isolation

## Non-Goals

- rethinking the public API
- removing Vue-native refs
- removing SSR snapshot helpers
- dropping `ttl` in the current release line
- reopening deferred suspense work as part of simplification

## Recommendation

Proceed with a simplification pass, but keep it explicitly scoped to architecture and maintainability.

The best first implementation step is:

1. create `provider-state` and `cache-helper`
2. split `config.ts`
3. migrate `use-swrv.ts` to those helpers without changing behavior

If that lands cleanly, the rest of the simplification should become incremental instead of risky.
