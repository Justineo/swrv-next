# Selective SWR implementation alignment

Status: completed
Date: 2026-03-19

## Goal

Align SWRV’s internal module structure and helper flow more closely with SWR, while preserving the
Vue-native runtime model.

## Guardrails

- Do not port React-specific rendering or state mechanisms.
- Do not port SWR’s dependency collection model.
- Do not replace named provider-state structures with tuple-style storage unless it clearly
  simplifies the code.
- Prefer structural alignment that reduces complexity, not churn for its own sake.

## Scope

## In scope

- file/module structure
- argument normalization flow
- config resolution flow
- middleware application flow
- feature-local type placement
- internal naming cleanup where SWR names are clearer

## Out of scope

- React render-state machinery
- React suspense/RSC internals
- Vue-facing public API renames

## Phase 1. Establish an SWR-shaped entry flow

### Objective

Make base and feature entry points follow one clear pipeline similar to SWR’s `withArgs`.

### Work

- introduce a helper that owns:
  - arg normalization
  - inherited config lookup
  - config merge
  - built-in middleware append
  - middleware application
- use it for:
  - base hook
  - immutable
  - infinite
  - mutation
  - subscription

### Expected outcome

The public entrypoints become easier to compare with SWR and easier to reason about locally.

## Phase 2. Restructure the base-hook files into an `index/` family

### Objective

Bring the base-hook source tree closer to SWR’s `index/` layout.

### Candidate target

- `src/index/index.ts`
- `src/index/use-swrv.ts`
- `src/index/serialize.ts`
- optional thin forwarding exports from the current top-level paths if needed during the refactor

### Expected outcome

The core hook family becomes mechanically closer to SWR’s organization.

## Phase 3. Split feature-local types out of `_internal/types.ts`

### Objective

Reduce the centrality of `_internal/types.ts`.

### Work

- move mutation-specific types into `mutation/types.ts`
- move subscription-specific types into `subscription/types.ts`
- move infinite-specific types into `infinite/types.ts`
- keep only shared core runtime types in `_internal/types.ts`

### Expected outcome

Feature modules become easier to navigate and maintain.

## Phase 4. Tighten internal naming to SWR’s conceptual vocabulary

### Objective

Rename only where it materially improves clarity and comparability.

### Candidate alignments

- `normalizeHookArgs` → `normalizeArgs` or `normalize`
- `resolveMiddlewareStack` + `applyMiddleware` → a clearer `withMiddleware`-style helper
- if introduced, a `withArgs`-style wrapper with SWR-like naming

### Non-goal

Do not rename aggressively just to mimic SWR when the current name is already clearer in Vue.

## Phase 5. Continue thinning provider-state and client seams

### Objective

Keep the explicit `SWRVClient`, but reduce its role to a narrow provider-bound facade.

### Work

- check whether more logic can move from `client.ts` into helper modules without increasing
  indirection
- ensure the client remains:
  - thin
  - declarative
  - easy to compare against SWR’s `initCache` + global-state pattern

### Expected outcome

The explicit client survives as a Vue-appropriate primitive, but with less service-object weight.

## Validation

- existing unit suite
- e2e suite
- package build
- spot-check that docs and `_internal` exports still reflect the intended structure

## Recommended order

1. Phase 1
2. Phase 3
3. Phase 2
4. Phase 4
5. Phase 5

This order captures the highest-value architectural alignment first, before spending effort on file
movement and naming.

## Completion

Completed on 2026-03-19.

Delivered:

- shared `withArgs` / `withMiddleware` entry flow
- base-hook `src/index/` family plus top-level forwarding exports
- feature-local `types.ts`, `state.ts`, and infinite serialization helpers
- removal of the old ad hoc middleware and normalize helpers
- validation through package check, unit tests, browser e2e, package build, and workspace build
