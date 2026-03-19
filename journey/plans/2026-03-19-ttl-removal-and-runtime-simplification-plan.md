# TTL removal and runtime simplification plan

Status: proposed
Date: 2026-03-19

## Goal

Remove the public `ttl` option and all associated expiry logic from `swrv-next`, then simplify the
remaining cache and mutation paths as far as possible in the same pass.

## Non-goals

- Do not replace `ttl` with another core hook option.
- Do not reintroduce hidden expiry behavior internally.
- Do not revisit the deferred suspense lane here.
- Do not change visual site theme files as part of this lane.

## Target end state

- `ttl` is gone from the public API.
- `expiresAt` is gone from internal cache state.
- `updatedAt` is removed unless a real consumer is introduced in the same pass.
- cache reads are pure and side-effect free.
- cache writes no longer accept storage-policy arguments.
- mutation logic no longer preserves or recalculates cache lifetime.
- lifecycle cleanup tests remain, but TTL behavior tests are removed.
- docs and migration notes explain the removal clearly and point advanced users toward provider-level
  custom caches if they want expiry behavior.

## Scope map

## Runtime and types

- [`packages/swrv/src/_internal/types.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/types.ts)
- [`packages/swrv/src/_internal/cache-helper.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/cache-helper.ts)
- [`packages/swrv/src/_internal/client.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/client.ts)
- [`packages/swrv/src/_internal/mutate.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/mutate.ts)
- [`packages/swrv/src/_internal/web-preset.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/web-preset.ts)
- [`packages/swrv/src/_internal/ssr.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/ssr.ts)
- [`packages/swrv/src/use-swrv-handler.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv-handler.ts)
- [`packages/swrv/src/infinite/index.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/index.ts)

## Tests

- [`packages/swrv/tests/core-ttl-lifecycle.test.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/tests/core-ttl-lifecycle.test.ts)
- [`packages/swrv/tests/core-local-mutate.test.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/tests/core-local-mutate.test.ts)
- [`packages/swrv/tests/core-cache-provider.test.ts`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/tests/core-cache-provider.test.ts)
- any other tests that seed raw cache state with `expiresAt` or `updatedAt`

## Docs and package metadata

- [`packages/site/docs/api.md`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/site/docs/api.md)
- [`packages/site/docs/migrate-from-v1.md`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/site/docs/migrate-from-v1.md)
- [`packages/swrv/README.md`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/README.md)
- [`journey/design.md`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/journey/design.md)

## Execution plan

## Phase 1. Remove TTL from public and resolved configuration

### Changes

- delete `ttl?: number` from `SWRVConfiguration`
- delete `ttl: number` from `ResolvedSWRVConfiguration`
- delete `ttl: 0` from `INTERNAL_DEFAULT_CONFIGURATION`
- remove `ttl` from public docs and README
- change migration docs from “`ttl` still exists” to “`ttl` was removed”

### Expected simplification

- the public options list becomes closer to SWR
- config merge/default paths become smaller
- future features no longer need to consider hook-level expiry as part of the option space

## Phase 2. Remove expiry metadata from cache state

### Changes

- delete `expiresAt` from `CacheState`
- delete `updatedAt` from `CacheState` unless a real runtime consumer is introduced in the same
  change
- update all seeded cache fixtures in tests to the smaller shape

### Expected simplification

- `CacheState` becomes about request state, not storage policy
- tests stop carrying fake bookkeeping fields

### Important note

This is the right moment to remove `updatedAt`. Keeping it after TTL removal would preserve a dead
field with no behavioral value.

## Phase 3. Collapse the cache helper and client write path

### Changes

- make `cacheHelper.get()` a pure read
- remove expiry checks, `Date.now()` calls, delete-on-read, and notify-on-expiry
- remove the `ttl` parameter from `cacheHelper.set()`
- remove the `ttl` parameter from `client.setState()`
- update `hydrateSWRVSnapshot()` to use the new write signature

### Expected simplification

- read path is deterministic and side-effect free
- write path only carries state changes, not storage policy
- `createSWRVClient()` becomes easier to reason about

## Phase 4. Remove TTL plumbing from hook and infinite writes

### Changes

- remove all `configValue.ttl` arguments in `use-swrv-handler.ts`
- remove `config.ttl ?? 0` in `infinite/index.ts`
- introduce one small local helper in `use-swrv-handler.ts` if it improves readability, for
  example a single state-write wrapper that only takes `serializedKey`, `rawKey`, and `patch`

### Expected simplification

- fetch lifecycle branches become smaller
- success, error, and paused-state writes become uniform
- infinite page writes match the base hook write model

## Phase 5. Simplify mutation logic after TTL removal

### Changes

- remove synthetic `expiresAt` fallback state in `_internal/mutate.ts`
- remove “preserve remaining TTL” calculations
- unify optimistic, rollback, populate-cache, and cleanup writes around the new no-TTL `setState`
  signature

### Expected simplification

- `_internal/mutate.ts` becomes materially easier to read
- mutation code no longer mixes storage policy with data update behavior

## Phase 6. Reshape tests around the new model

### Changes

- delete the TTL-specific cases from `core-ttl-lifecycle.test.ts`
- preserve the listener and revalidator cleanup cases, but move them into a renamed or split file
  such as:
  - `core-client-cleanup.test.ts`, or
  - `core-lifecycle-cleanup.test.ts`
- remove `expiresAt` and `updatedAt` from seeded cache fixtures in provider and mutate tests
- add one targeted regression assertion that confirms raw seeded cache entries still work with the
  smaller state shape

### Expected simplification

- the test suite matches the new design instead of carrying legacy cache-expiry concepts
- lifecycle cleanup has a clearer domain file name

## Phase 7. Finish docs, migration, and project memory

### Changes

- remove `ttl` from API docs
- rewrite migration guidance to say:
  - `ttl` is removed from core
  - use explicit invalidation, revalidation, or a custom provider cache instead
- remove compatibility notes about retained TTL support from README
- update `journey/design.md` to replace the earlier “keep ttl” decision
- add a completion log summarizing removal and simplification wins

## Suggested implementation order

1. `types.ts` and `web-preset.ts`
2. `cache-helper.ts` and `client.ts`
3. `ssr.ts`
4. `use-swrv-handler.ts` and `infinite/index.ts`
5. `_internal/mutate.ts`
6. tests
7. docs and journey memory

This order keeps type fallout visible early, then clears the shared write path before touching the
larger hook files.

## Validation plan

Minimum validation:

- `vp check`
- `vp test`
- `vp run site#build`

Recommended extra validation after the code change:

- `vp run ready`

Because this touches internal state shape and cache behavior, the full ready pipeline is worth
running before the branch is considered complete.

## Risks to watch during implementation

- Advanced code that writes raw cache entries may break if it assumed `expiresAt` and `updatedAt`
  are part of the stored state shape.
- `_internal` consumers may break on `CacheState` and `SWRVClient.setState` signature changes.
- lifecycle cleanup assertions must survive the TTL-test removal; do not delete that coverage by
  accident.
- the docs and design snapshot currently still document `ttl` as retained, so they must be updated
  in the same lane to avoid contradictory memory.

## Optional follow-up, not part of the core removal

If expiring cache is still desirable later, add it back only as a provider-level or addon-level
feature, for example:

- `createSWRVClient({ cache: createExpiringCache(...) })`
- a `swrv/cache-expiry` addon

Do not bring it back as a per-hook core option.
