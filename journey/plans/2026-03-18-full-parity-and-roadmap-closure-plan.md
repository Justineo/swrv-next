# SWRV Next Full-Parity and Roadmap-Closure Plan

Date: 2026-03-18
Status: Planning

## Purpose

This plan defines the remaining work required to move `swrv-next` from the current launch-ready prerelease cut to a stable `2.0` line that:

1. closes the unfinished parts of the original rebuild roadmap
2. reaches full feature parity with `swr`, except for React-only capabilities such as server components and legacy React support
3. explicitly addresses the areas where `swr` still leads
4. ports or adapts every upstream `swr` and legacy `swrv` test case that is applicable to `swrv-next`

This is a completion plan, not a greenfield roadmap. It starts from the current state recorded in [journey/design.md](../design.md).

## End State

The work is complete when all of the following are true:

- the stable `2.0` scope is frozen and fully documented
- every non-React-only `swr` feature has a Vue-native counterpart or an explicit documented equivalence
- the remaining areas where `swr` still leads are either closed or intentionally deferred with rationale
- every applicable `swr` and legacy `swrv` test has been classified as:
  - directly ported
  - behavior-adapted for Vue
  - intentionally not applicable
- the docs are reference-quality, not only "current scope" docs
- the package is validated for stable release, not only `next` dry-runs

## Remaining Workstreams

### 1. Roadmap Closure

Objective:

- convert the current "launch-ready current cut" into a fully closed stable-release roadmap state

Required outputs:

- stable `2.0` closure checklist
- explicit resolution of follow-up questions in [journey/design.md](../design.md)
- final roadmap log marking what shipped in `2.0` and what moved to post-`2.0`

Open items from the original roadmap that are not fully closed yet:

- deeper SSR and hydration story beyond the current explicit client plus `fallback` contract
- exhaustive upstream parity proof through test ports, not only targeted parity hardening
- reference-grade docs and migration coverage
- stable release execution, not only prerelease readiness

### 2. Core Runtime and Performance Cleanup

Objective:

- finish the internal cleanup and edge behavior needed before the API can be considered truly parity-grade

Must-do items:

- remove redundant post-`setState()` `applyState()` sync work where listener notification already covers the active hook
- replace unstable `watch(() => serialize(...))` tuple sources with stable watch keys or explicit equality guards
- consider using listener payloads to avoid redundant cache reads on subscription-driven updates
- complete any remaining request, mutation, and revalidation race hardening discovered while porting upstream tests

Why this matters:

- these are not flashy features, but they affect correctness under heavy churn and also determine whether the Vue implementation is clean rather than an approximate port

### 3. Full Core Feature Parity with `swr`

Objective:

- cover every non-React-only feature area that `swr` exposes or behaviorally guarantees

Feature targets:

- base `useSWRV` parity across config, key handling, cache behavior, revalidation, retries, loading, fallback, and middleware
- `immutable`, `preload`, `mutate`, `useSWRVMutation`, `useSWRVInfinite`, `useSWRVSubscription` parity
- Vue-appropriate equivalent for `swr` suspense behavior
- Vue-appropriate equivalent for non-React-specific devtools or middleware preset capabilities
- server and hydration behavior parity where the behavior is platform-agnostic

Explicit non-targets because they are React-only:

- `react-server` exports
- legacy React support behavior
- React concurrent rendering mechanics as React APIs

However:

- if a React-only test contains a platform-agnostic race or cache invariant, we should salvage the behavior into Vue/runtime tests rather than discard it wholesale

### 4. Areas Where `swr` Still Leads

These must be treated as active work, not background observations.

| Area where `swr` leads                | Current situation in `swrv-next`                                             | Required next step                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| test breadth                          | targeted parity suite exists, but far smaller than upstream                  | complete upstream test inventory classification and port/adapt every applicable case           |
| server and SSR semantics              | explicit client plus `fallback` path exists, but the story is still narrower | decide and implement the full Vue SSR and hydration surface for `2.0`                          |
| suspense support                      | not yet a documented and fully tested parity surface                         | add Vue Suspense-compatible behavior and type coverage, or explicitly scope it out of `2.0`    |
| devtools / built-in middleware preset | no equivalent surface yet                                                    | decide whether to ship a Vue devtools integration or a smaller debug middleware story in `2.0` |
| type breadth                          | strong baseline exists, but upstream has broader coverage                    | port/adapt all applicable upstream type tests and expand Vue-specific type cases               |
| docs depth                            | current docs are good working docs, not exhaustive reference docs            | finish full API reference, examples, migration matrix, SSR guide, and parity notes             |
| release maturity                      | prerelease line and dry-runs are working                                     | execute stable release checklist and trusted-publisher production validation                   |

### 5. Complete Upstream Test Ingestion

Objective:

- make the test plan explicit and exhaustive, instead of relying on opportunistic parity additions

Rules:

- every upstream `swr` and legacy `swrv` test file must be classified
- every applicable case must be either ported directly or adapted by behavior
- every non-applicable file must have a written reason
- the new suite should be reorganized by domain so upstream ports have obvious landing zones

Recommended `swrv-next` test layout after reorganization:

- `packages/swrv/tests/unit/*`
- `packages/swrv/tests/behavior/*`
- `packages/swrv/tests/type/*`
- `packages/swrv/tests/ssr/*`
- `packages/swrv/tests/e2e/*`

### 6. Docs and Migration Completion

Objective:

- finish the public explanation layer so the stable release is understandable without reading source

Must-do items:

- complete API reference for every public export and option
- add parity notes showing exact `swr` equivalence and Vue-specific differences
- add migration guidance from legacy `swrv`
- add SSR, preload, mutation, infinite, subscription, middleware, and suspense guidance
- add "what is intentionally different from SWR" and "what remains post-`2.0`" pages

### 7. Stable Release Closure

Objective:

- move from a validated prerelease cut to an actual stable `2.0` release process

Must-do items:

- stable version-line decision confirmed in docs and workflow
- final package artifact audit
- changelog and GitHub release process confirmed
- npm Trusted Publisher production validation
- stable-release checklist logged in `journey/logs/`

## Recommended Sequencing

### Phase 1: Freeze `2.0` Scope and Build the Parity Matrix

Objective:

- stop treating the remaining work as an open-ended cleanup stream

Tasks:

- decide whether Vue Suspense parity is in `2.0`
- decide whether a devtools story is in `2.0`
- decide how far SSR and hydration parity goes in `2.0`
- create the upstream test classification matrix below as an active tracking document during implementation

Dependency:

- none; this should happen first

### Phase 2: Runtime Cleanup and Core Semantic Closure

Objective:

- finish internal cleanup and any base-hook semantic gaps before expanding the suite further

Tasks:

- implement the dependency-research cleanup items
- finish remaining base hook parity gaps discovered during the matrix pass
- lock the final SSR and hydration contract

Dependency:

- Phase 1 scope decisions

### Phase 3: Advanced Feature Closure

Objective:

- make `infinite`, `mutation`, `subscription`, middleware, suspense, and devtools parity-grade

Tasks:

- complete `infinite` edge cases
- complete mutation edge cases
- complete subscription lifecycle edge cases
- add suspense or explicitly defer it
- add devtools or explicitly defer it

Dependency:

- Phase 2 base/runtime stability

### Phase 4: Exhaustive Test Porting

Objective:

- convert the upstream matrix into actual coverage

Tasks:

- port/adapt every applicable `swr` type, unit, behavior, and SSR test
- port/adapt every applicable legacy `swrv` compatibility test
- split the current monolithic `swrv.test.ts` into domain files that mirror the matrix

Dependency:

- Phases 2 and 3 provide the target behavior to test

### Phase 5: Docs and Stable Release

Objective:

- finish the public product surface and publish stable

Tasks:

- complete reference docs
- complete migration docs
- run stable release checklist
- tag and publish stable `2.0`

Dependency:

- parity and test closure must already be done

## Upstream `swr` Test Inventory Plan

The table below is the required classification for every upstream `swr` test file currently visible in the local checkout.

| Upstream `swr` test file                     | Applicability            | Action in `swrv-next`                       | Notes                                                                    |
| -------------------------------------------- | ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------ |
| `test/type/config.tsx`                       | applicable               | adapt                                       | map config typing to Vue API and any suspense-equivalent typing          |
| `test/type/fetcher.ts`                       | applicable               | adapt                                       | fetcher inference should match Vue key and fetcher signatures            |
| `test/type/helper-types.tsx`                 | partially applicable     | adapt                                       | keep generic helper expectations, exclude React-only helper types        |
| `test/type/internal.tsx`                     | partially applicable     | adapt                                       | port only exported internal helper types that exist in `swrv-next`       |
| `test/type/mutate.ts`                        | applicable               | adapt                                       | mutation and bound/global mutate typing must be covered                  |
| `test/type/mutation.ts`                      | applicable               | adapt                                       | `useSWRVMutation` trigger and option typing                              |
| `test/type/option-fetcher.ts`                | applicable               | adapt                                       | option-level fetcher typing and overrides                                |
| `test/type/preload.ts`                       | applicable               | adapt                                       | preload key and fetcher typing                                           |
| `test/type/subscription.ts`                  | applicable               | adapt                                       | subscription key and callback typing                                     |
| `test/type/trigger.ts`                       | applicable               | adapt                                       | trigger overload and arg optionality                                     |
| `test/type/suspense/*`                       | conditionally applicable | adapt if suspense is in `2.0`               | otherwise mark deferred with rationale                                   |
| `test/unit/serialize.test.ts`                | applicable               | direct port                                 | serialization must stay stable                                           |
| `test/unit/utils.test.tsx`                   | partially applicable     | adapt                                       | keep generic helpers, drop React helper assumptions                      |
| `test/unit/web-preset.test.ts`               | applicable               | adapt                                       | map to `swrv-next` browser event layer                                   |
| `test/use-swr-cache.test.tsx`                | applicable               | adapt                                       | cache/provider behavior                                                  |
| `test/use-swr-concurrent-rendering.test.tsx` | partially applicable     | salvage behavior                            | do not port React concurrent APIs; port race and dedupe invariants       |
| `test/use-swr-config-callbacks.test.tsx`     | applicable               | adapt                                       | config callback parity                                                   |
| `test/use-swr-config.test.tsx`               | applicable               | adapt                                       | core option semantics                                                    |
| `test/use-swr-context-config.test.tsx`       | applicable               | adapt                                       | provider/config merge semantics                                          |
| `test/use-swr-devtools.test.tsx`             | conditionally applicable | add parity lane                             | requires decision on devtools-equivalent scope                           |
| `test/use-swr-error.test.tsx`                | applicable               | adapt                                       | error lifecycle and retry semantics                                      |
| `test/use-swr-fetcher.test.tsx`              | applicable               | adapt                                       | fetcher lifecycle, latest reference, arg handling                        |
| `test/use-swr-focus.test.tsx`                | applicable               | direct port                                 | focus revalidation semantics                                             |
| `test/use-swr-immutable.test.tsx`            | applicable               | direct port                                 | immutable behavior                                                       |
| `test/use-swr-infinite-preload.test.tsx`     | applicable               | adapt                                       | preload plus infinite semantics                                          |
| `test/use-swr-infinite.test.tsx`             | applicable               | adapt                                       | exhaustive infinite behavior parity                                      |
| `test/use-swr-integration.test.tsx`          | applicable               | adapt                                       | cross-feature invariants                                                 |
| `test/use-swr-key.test.tsx`                  | applicable               | adapt                                       | key serialization and key source behavior                                |
| `test/use-swr-laggy.test.tsx`                | applicable               | adapt                                       | maps to `keepPreviousData` and stale display behavior                    |
| `test/use-swr-legacy-react.test.tsx`         | not applicable           | mark N/A                                    | React-only support line                                                  |
| `test/use-swr-loading.test.tsx`              | applicable               | direct port                                 | loading semantics                                                        |
| `test/use-swr-local-mutation.test.tsx`       | applicable               | adapt                                       | optimistic update, rollback, populate cache, races                       |
| `test/use-swr-middlewares.test.tsx`          | applicable               | adapt                                       | middleware ordering and config merge behavior                            |
| `test/use-swr-node-env.test.tsx`             | applicable               | adapt                                       | server-render semantics in Vue SSR environment                           |
| `test/use-swr-offline.test.tsx`              | applicable               | direct port                                 | offline gating and reconnect                                             |
| `test/use-swr-preload.test.tsx`              | applicable               | adapt                                       | preload behavior, including suspense-dependent branches if in scope      |
| `test/use-swr-promise.test.tsx`              | applicable               | adapt                                       | promise lifecycle semantics                                              |
| `test/use-swr-reconnect.test.tsx`            | applicable               | direct port                                 | reconnect behavior                                                       |
| `test/use-swr-refresh.test.tsx`              | applicable               | direct port                                 | interval and polling semantics                                           |
| `test/use-swr-remote-mutation.test.tsx`      | applicable               | adapt                                       | remote mutation coordination and races                                   |
| `test/use-swr-revalidate.test.tsx`           | applicable               | direct port                                 | revalidation semantics                                                   |
| `test/use-swr-server.test.tsx`               | partially applicable     | adapt                                       | keep server no-op and fallback semantics; exclude React-server specifics |
| `test/use-swr-streaming-ssr.test.tsx`        | conditionally applicable | adapt if Vue SSR streaming lane is in `2.0` | otherwise defer explicitly                                               |
| `test/use-swr-subscription.test.tsx`         | applicable               | adapt                                       | subscription lifecycle and error reset                                   |
| `test/use-swr-suspense.test.tsx`             | conditionally applicable | adapt if suspense is in `2.0`               | otherwise defer explicitly                                               |

## Legacy `swrv` Test Inventory Plan

The legacy test suite is smaller but still important for migration-sensitive behavior.

| Legacy `swrv` test file    | Applicability         | Action in `swrv-next`        | Notes                                                                                                                                        |
| -------------------------- | --------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/cache.spec.tsx`     | partially applicable  | adapt selective cases        | keep TTL and cache-behavior cases that still belong to core; localStorage adapter cases are only applicable if that adapter remains in scope |
| `tests/ssr.spec.ts`        | applicable            | adapt                        | translate to current explicit client plus fallback SSR contract and any new hydration helpers                                                |
| `tests/use-swrv.spec.tsx`  | broadly applicable    | decompose and port by domain | key handling, dedupe, falsy keys, loading, mutate, focus, refresh, error, retries, stale-if-error, effect scope, visibility, offline, TTL    |
| `tests/test-compat.sh`     | mostly not applicable | mark N/A or replace          | shell-level legacy compatibility harness is not a modern test strategy                                                                       |
| `tests/test-compat-all.sh` | mostly not applicable | mark N/A or replace          | same as above                                                                                                                                |

## Specific Legacy `swrv` Case Areas That Must Survive Review

The large `use-swrv.spec.tsx` file should be decomposed into explicit domain ports in `swrv-next`, covering these applicable behaviors:

- hydration and first-render data behavior
- promise and sync fetcher behavior
- function, ref, computed, and object keys
- deduplication in-flight and post-flight
- dependent fetching
- falsy-key no-fetch behavior
- per-hook config isolation
- key switching without leaking old refs
- cache-only reads without a fetcher
- TTL semantics that remain in scope
- loading and validating behavior
- `mutate` prefetch and revalidation behavior
- listener setup and teardown
- focus and visibility behavior
- interval refresh behavior
- stale-if-error and retry behavior
- effect-scope lifecycle behavior
- offline behavior

## Parallelization Strategy

These lanes can run in parallel after Phase 1:

- runtime cleanup plus base parity hardening
- test matrix ingestion and initial file-by-file scaffolding
- docs outline and migration matrix drafting

These lanes can run in parallel after Phase 2:

- `infinite` parity and tests
- `mutation` parity and tests
- `subscription` parity and tests
- SSR and hydration tests

These should stay sequential:

- final `2.0` scope decisions
- final stable release execution

## Milestones

| Milestone                    | Objective                                              | Exit criteria                                                                    |
| ---------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `P1` Scope matrix frozen     | freeze `2.0` parity target                             | suspense/devtools/SSR decisions recorded, upstream test matrix accepted          |
| `P2` Runtime cleanup done    | remove avoidable internal work and remaining base gaps | dependency-research cleanup shipped and base parity suite green                  |
| `P3` Feature parity closed   | finish non-React-only `swr` features                   | advanced APIs, middleware, suspense/devtools decisions implemented and tested    |
| `P4` Upstream tests absorbed | every applicable upstream case accounted for           | all `swr` and legacy `swrv` files classified and ported/adapted or marked N/A    |
| `P5` Stable release ready    | complete docs and release surface                      | reference docs complete, migration docs complete, stable publish checklist green |

## Immediate Next Steps

1. Freeze the `2.0` decision on Vue Suspense, devtools, and SSR/hydration depth.
2. Convert the test inventory tables above into active tracking checklists and split `packages/swrv/tests/swrv.test.ts` by domain.
3. Implement the dependency-research cleanup items before adding more ports on top of noisy internals.
4. Start the exhaustive upstream port sequence with:
   - `serialize`
   - config and provider behavior
   - loading, focus, reconnect, refresh
   - local and remote mutation
   - infinite and subscription
5. Run the legacy `swrv` domain pass after each matching `swr` domain so migration-sensitive Vue behavior is preserved rather than rediscovered late.

## Decision Rule

When there is tension between:

- old `swrv` behavior
- upstream `swr` behavior
- Vue-native ergonomics

the default rule remains:

- match `swr` behavior first
- express it in Vue-native form second
- preserve legacy `swrv` behavior only when it remains compatible with those two goals or is an explicit compatibility extension such as `ttl`
