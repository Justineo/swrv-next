# TTL removal analysis

Date: 2026-03-19
Status: complete

## Recommendation

If the stable `2.x` line is meant to prioritize SWR parity, runtime simplicity, and a smaller core
API, `ttl` should be removed completely from the public and internal runtime.

This should not be treated as “hide the option but keep the machinery”. The simplification only
really lands if the entire expiry path is deleted:

- the public `ttl` option
- the internal `expiresAt` state
- the `setState(..., ttl)` pipeline
- the optimistic-mutation TTL preservation path
- the TTL-specific tests and docs

## Why removing `ttl` is the right direction

### It is not part of the SWR core model

SWR’s model is built around:

- cache identity
- stale-while-revalidate behavior
- explicit invalidation and mutation
- app- or provider-level cache ownership

Per-hook expiry is not part of that mental model. Carrying `ttl` forward makes the SWRV surface
feel more like “legacy SWRV plus SWR features” than “Vue-native SWR”.

### It creates cross-cutting complexity

`ttl` is not localized to one option definition. It leaks into:

- cache state shape
- cache read semantics
- write signatures
- base hook revalidation
- infinite-page writes
- mutation rollback and optimistic flows
- tests that seed raw cache entries
- docs and migration copy

That makes the cache layer more policy-heavy than it needs to be.

### It blurs storage policy and request state

Right now `CacheState` mixes:

- observable request state
  - `data`
  - `error`
  - `isLoading`
  - `isValidating`
- implementation bookkeeping
  - `_c`
  - `_k`
- storage policy
  - `expiresAt`
- a dead timestamp
  - `updatedAt`

Once `ttl` is removed, `expiresAt` no longer belongs there, and `updatedAt` becomes even more
obviously unnecessary.

## Current footprint

## Public surface

`ttl` is currently present in:

- [`packages/swrv/src/_internal/types.ts`](../../packages/swrv/src/_internal/types.ts)
  - `SWRVConfiguration.ttl`
  - `ResolvedSWRVConfiguration.ttl`
- [`packages/site/docs/api.md`](../../packages/site/docs/api.md)
- [`packages/site/docs/migrate-from-v1.md`](../../packages/site/docs/migrate-from-v1.md)
- [`packages/swrv/README.md`](../../packages/swrv/README.md)
- [`journey/design.md`](../design.md)

`serverTTL` is already gone from the core API. That makes `ttl` the only remaining legacy expiry
surface.

## Runtime state shape

### Cache state

[`packages/swrv/src/_internal/types.ts`](../../packages/swrv/src/_internal/types.ts)
defines:

- `expiresAt`
- `updatedAt`

`expiresAt` is active TTL bookkeeping.

`updatedAt` appears to be dead weight. It is written but not read by the runtime.

### Cache helper

[`packages/swrv/src/_internal/cache-helper.ts`](../../packages/swrv/src/_internal/cache-helper.ts)
currently does two non-obvious things:

1. `get()` is not a pure read.
   It can:
   - compare `expiresAt` with `Date.now()`
   - delete the key
   - notify listeners
   - return `undefined`

2. `set()` is not a simple patch write.
   It:
   - accepts `ttl`
   - computes the next `expiresAt`
   - preserves previous expiry when `ttl` is `0`

That means even the most basic cache read and write path is carrying expiry logic.

### Client write signature

[`packages/swrv/src/_internal/client.ts`](../../packages/swrv/src/_internal/client.ts)
exposes:

```ts
setState(key, patch, ttl?, rawKey?)
```

This is a smell. The client state write path should accept state data, not storage lifetime policy.

## Runtime call sites

### Base hook

[`packages/swrv/src/use-swrv-handler.ts`](../../packages/swrv/src/use-swrv-handler.ts)
passes `configValue.ttl` into every major write:

- loading state
- paused success state
- normal success state
- paused error state
- normal error state

That means a fetch lifecycle now carries cache expiry policy on every write branch.

### Infinite

[`packages/swrv/src/infinite/index.ts`](../../packages/swrv/src/infinite/index.ts)
passes `config.ttl ?? 0` when it writes individual page results.

### Mutation

[`packages/swrv/src/_internal/mutate.ts`](../../packages/swrv/src/_internal/mutate.ts)
is the most coupled piece after the cache helper:

- it synthesizes a fallback `currentState` with `expiresAt`
- it preserves remaining TTL during optimistic updates
- it writes rollback and populated values with a TTL argument

This is the one place where cache expiry is mixed directly into remote-write orchestration.

## Test surface

TTL is directly tested in:

- [`packages/swrv/tests/core-ttl-lifecycle.test.ts`](../../packages/swrv/tests/core-ttl-lifecycle.test.ts)

But expiry metadata also leaks into non-TTL tests because they seed raw cache records with
`expiresAt` and `updatedAt`:

- [`packages/swrv/tests/core-local-mutate.test.ts`](../../packages/swrv/tests/core-local-mutate.test.ts)
- [`packages/swrv/tests/core-cache-provider.test.ts`](../../packages/swrv/tests/core-cache-provider.test.ts)

## Behavioral implications of removal

Once `ttl` is removed:

- cache entries persist until:
  - overwritten
  - deleted by the provider
  - invalidated through mutation or revalidation flows
- reads stop having eviction side effects
- optimistic writes stop preserving or recalculating expiry
- infinite page writes become ordinary cache writes

This is more predictable and closer to SWR’s model.

## Simplification opportunities unlocked by removal

## 1. Make cache reads pure

`cacheHelper.get()` can become a normal adapter read with no hidden mutation, no `Date.now()` call,
and no delete-plus-notify branch.

That is the single biggest architectural simplification.

## 2. Collapse the write path

`cacheHelper.set()` and `client.setState()` can drop the TTL parameter and become ordinary merge
operations. Every caller becomes simpler.

## 3. Remove dead metadata

If `ttl` goes away, `updatedAt` should go too unless a new caller is introduced in the same pass.

At the moment it is written but unused, so keeping it would only preserve stale shape complexity.

## 4. Simplify mutation orchestration

Without expiry preservation:

- `currentState` fallback becomes smaller
- optimistic writes no longer need remaining-lifetime math
- rollback and populate-cache writes become uniform

This should materially improve readability in `_internal/mutate.ts`.

## 5. Simplify test fixtures

Seeded cache entries in tests can drop fake bookkeeping fields and use the minimum state shape
required by the runtime.

## 6. Retire the TTL-specific domain file

`core-ttl-lifecycle.test.ts` currently mixes two concerns:

- TTL behavior
- listener and revalidator cleanup

After removal, the cleanup assertions should survive in a renamed or split lifecycle/cleanup file,
while TTL-specific cases disappear entirely.

## Risks and migration impact

## Advanced users writing raw cache entries

The main compatibility risk is not ordinary hook consumers. It is advanced code that does direct
cache writes through:

- `useSWRVConfig().cache`
- custom provider maps
- `_internal` types

Those users may have assumed raw cache entries include `expiresAt` and `updatedAt`.

This is acceptable if we treat the rewrite as a clean major line and keep the migration note
explicit.

## `_internal` consumers

The `_internal` entry point is exported. That means signature changes to:

- `CacheState`
- `SWRVClient.setState`

are not literally private. Still, if the project stance is “no compatibility for internal
contracts”, this is the correct time to simplify them.

## Semantics for existing TTL users

Any user actively relying on `ttl` will lose automatic expiry behavior. That should be addressed
through migration guidance, not by carrying the feature in core.

## Recommended replacement model

If expiring cache is still desirable after removal, it should come back in one of these forms:

- a provider-level custom cache implementation
- a client factory extension
- a separate addon package

It should not remain as a per-hook core option.

In other words:

- **remove `ttl` from core**
- **do not reintroduce hidden expiry plumbing**
- **if needed later, reintroduce expiry as cache policy, not hook policy**
