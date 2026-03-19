# SWRV Next Remaining Work Without Suspense

Date: 2026-03-19
Status: Active

## Context

`swrv-next` is now at a strong prerelease state:

- monorepo shape is stable
- runtime, docs, CI, pack, and publish dry-runs pass
- `vp test` currently passes with 21 files and 191 tests
- major SWR-aligned surfaces already exist for base hook, `immutable`, `infinite`, `mutation`, `subscription`, SSR snapshot helpers, devtools middleware, and release automation

For the moment, `suspense` is intentionally left out of the active execution lane.
Its feasibility and constraints are recorded in:

- [journey/research/2026-03-19-vue-suspense-feasibility.md](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/journey/research/2026-03-19-vue-suspense-feasibility.md)

## Remaining Active Work

### 1. Finish Exhaustive Upstream Test Ingestion

Objective:

- move from strong targeted parity coverage to explicit exhaustive parity proof

Remaining tasks:

- build a file-by-file classification matrix for every upstream `swr` test file and every legacy `swrv` test file:
  - directly ported
  - behavior-adapted for Vue
  - intentionally not applicable
- port the remaining non-React-only SWR behavior tests that are still missing or only partially represented
- port the remaining applicable SWR type tests into `packages/swrv/tests/swrv.types.ts` or split them into dedicated type files
- port the remaining applicable legacy `swrv` compatibility cases, especially where they cover `ttl`, cache adapters, or Vue-specific lifecycle behavior we still claim to support

High-probability remaining upstream areas:

- `test/type/config.tsx`
- `test/type/fetcher.ts`
- `test/type/helper-types.tsx`
- `test/type/internal.tsx`
- `test/type/mutate.ts`
- `test/type/mutation.ts`
- `test/type/option-fetcher.ts`
- `test/type/preload.ts`
- `test/type/subscription.ts`
- `test/type/trigger.ts`
- `test/unit/utils.test.tsx`
- `test/unit/web-preset.test.ts`
- `test/use-swr-cache.test.tsx`
- `test/use-swr-config.test.tsx`
- `test/use-swr-context-config.test.tsx`
- `test/use-swr-node-env.test.tsx`
- the non-suspense portions of `test/use-swr-preload.test.tsx`
- the non-suspense portions of `test/use-swr-infinite-preload.test.tsx`
- the non-suspense portions of `test/use-swr-promise.test.tsx`, if we decide promise fallback is still in scope without `suspense`
- legacy `swrv` cache-adapter and TTL behavior tests that are still materially relevant

### 2. Close Remaining Non-Suspense SWR Feature Gaps

Objective:

- finish the feature surface where SWR still leads and the gap is not React-specific

Most likely remaining gaps:

- custom web preset hooks or equivalent config surface for focus/reconnect initialization if we want parity with SWR's `initFocus` and `initReconnect`
- any remaining provider/cache behavior from upstream `use-swr-cache.test.tsx`
- any remaining promise-based fallback semantics that we want to support independently of `suspense`
- any remaining advanced `infinite`, `mutation`, or `subscription` edge cases discovered during the exhaustive test pass

Guideline:

- only add a feature if it is either:
  - part of clear SWR parity
  - required by an already-supported SWRV compatibility promise
  - justified by Vue-native DX

### 3. Finish Type-System Parity

Objective:

- move from "strong public typing" to "exhaustively defended public typing"

Remaining tasks:

- split compile-time tests by area if `swrv.types.ts` becomes unwieldy
- port the remaining upstream SWR type expectations that apply to Vue
- decide whether to add more helper types for documenting blocking or filled data semantics without introducing React-specific type concepts
- audit subpath exports and declaration shape one more time from packed artifacts

### 4. Reference-Quality Docs and Migration Closure

Objective:

- move from good working docs to stable-release docs

Remaining tasks:

- complete the API reference for every exported hook, helper, type, and option
- add explicit parity notes:
  - what matches SWR
  - what is intentionally Vue-native
  - what is deferred
- strengthen migration guidance from legacy `swrv`
- add one page or section that classifies:
  - shipped in `2.0`
  - deferred from `2.0`
  - intentionally different from SWR

### 5. Stable Release Closure

Objective:

- move from validated prerelease to stable release readiness

Remaining tasks:

- create a concrete stable-release checklist in `journey/logs/`
- run final packed-artifact audits
- verify trusted publisher production settings, not only dry-runs
- finalize the stable changelog and release notes process
- explicitly close the roadmap cut in logs once the above are done

## Deferred Work

### Suspense

Deferred for now.

Current state:

- mount-time suspension looks technically viable
- later key-change re-suspension is not cleanly available through the same Vue mechanism

Implication:

- `suspense` should stay out of the current execution lane until product scope is decided

## Recommended Order

1. Finish the upstream test classification matrix.
2. Port the remaining non-suspense SWR behavior and type tests.
3. Implement only the runtime changes exposed by those tests.
4. Port the remaining applicable legacy `swrv` tests.
5. Upgrade docs from working to reference-quality.
6. Run the stable release closure checklist.

## Practical Next Task

The next highest-value task is:

- finish the remaining applicable upstream type files under `test/type/*`, then use the matrix in `journey/plans/2026-03-19-upstream-test-matrix.md` to close the remaining `cache`, `node-env`, and legacy `swrv` audit items

That will tell us whether the next work is mostly:

- missing tests
- small runtime gaps
- or an actual unimplemented feature like custom focus/reconnect initialization hooks
