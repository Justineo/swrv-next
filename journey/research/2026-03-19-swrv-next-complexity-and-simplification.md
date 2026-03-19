# SWRV Next Complexity And Simplification

Date: 2026-03-19
Status: Open

## Question

Does `swrv-next` carry materially more implementation complexity than upstream `swr`, and if so, how much of that complexity is necessary versus accidental?

## Executive Summary

`swrv-next` does not appear obviously larger than upstream `swr` in raw line count for the core runtime files that matter most. The base hook is `833` lines in `swrv-next` versus `860` in `swr`, and the advanced API modules are in the same general range.

The difference is architectural shape, not just size:

- `swr` keeps most internal state as provider-scoped records in a single global-state tuple bound to the cache, and exposes that state through a small set of narrow helpers.
- `swrv-next` reifies that same internal state as a richer `SWRVClient` service object with many methods and additional helper caches.
- `swr` has a clearer split between:
  - config context
  - argument normalization
  - cache/global-state helpers
  - the base hook handler
- `swrv-next` currently bundles more of that responsibility into:
  - `config.ts`
  - `_internal/client.ts`
  - `use-swrv.ts`

Conclusion:

- Some complexity in `swrv-next` is necessary and legitimate, especially where Vue’s ref model, effect scopes, and SSR handoff differ from React.
- A meaningful slice of the current complexity is accidental and can be simplified by moving closer to SWR’s core module ideas:
  - provider-scoped data structures instead of a rich client object
  - thinner helper layers
  - clearer separation between config resolution, state storage, and request lifecycle
  - keeping optional features out of the core execution path

## Evidence

Selected file sizes:

| Area           |                                     `swrv-next` |                                                                                           `swr` | Observation                                    |
| -------------- | ----------------------------------------------: | ----------------------------------------------------------------------------------------------: | ---------------------------------------------- |
| base hook      |           `packages/swrv/src/use-swrv.ts` `833` |                                                                    `src/index/use-swr.ts` `860` | Similar scale                                  |
| config context |             `packages/swrv/src/config.ts` `239` | `config-context.ts` `68` + `use-swr-config.ts` `15` + `cache.ts` `135` + `resolve-args.ts` `27` | `swrv-next` concentrates more responsibilities |
| mutate core    |   `packages/swrv/src/_internal/mutate.ts` `233` |                                                                         `utils/mutate.ts` `219` | Similar scale                                  |
| preload core   |   `packages/swrv/src/_internal/preload.ts` `62` |                                                                         `utils/preload.ts` `69` | Similar scale                                  |
| infinite       |     `packages/swrv/src/infinite/index.ts` `369` |                                                                   `src/infinite/index.ts` `355` | Similar scale                                  |
| mutation       |     `packages/swrv/src/mutation/index.ts` `291` |                                                                   `src/mutation/index.ts` `175` | `swrv-next` is heavier here                    |
| subscription   | `packages/swrv/src/subscription/index.ts` `145` |                                                               `src/subscription/index.ts` `134` | Similar scale                                  |

What makes `swrv-next` feel heavier is the abstraction layer around state:

- `swr`:
  - `SWRGlobalState` is a `WeakMap<Cache, GlobalState>`
  - the internal state is plain records or tuples
  - helpers like `createCacheHelper`, `initCache`, and `withArgs` are narrow and data-oriented
- `swrv-next`:
  - `SWRVClient` exposes a wide method surface:
    - `getState`
    - `setState`
    - `subscribe`
    - `addRevalidator`
    - `broadcast`
    - `broadcastAll`
    - `getFetch`
    - `startFetch`
    - `invalidateFetch`
    - `getMutation`
    - `setMutation`
    - `preload`
    - `consumePreload`
    - `dispose`
  - the same provider-scoped runtime facts are present, but as an object-capability layer rather than a thinner state-plus-helper model

That object layer is explicit and readable, but it also spreads cognitive load across more custom APIs than upstream SWR uses.

## The Core Ideas In SWR’s Structure

The upstream module structure distills down to a few ideas:

### 1. Cache provider is the state boundary

SWR treats the cache provider as the boundary for:

- fetch dedupe lanes
- mutation timestamps
- preload entries
- subscriptions
- revalidators

It does not build a heavy service object on top of that. It binds a plain global-state record to the cache and uses helper functions to read or write it.

### 2. The base hook owns most of the semantic complexity

The real complexity in SWR is mostly inside `use-swr.ts`:

- request lifecycle
- stale-data decisions
- revalidation triggers
- race handling
- optimistic mutation interactions
- render-state derivation

Everything else is mostly there to feed the base hook with:

- resolved config
- normalized args
- cache-bound helpers

### 3. Advanced APIs mostly compose on shared primitives

`infinite`, `mutation`, and `subscription` in SWR are comparatively thin because they lean on:

- `withMiddleware`
- `createCacheHelper`
- the cache-bound mutate function
- the same provider-scoped global state

They do not build their own parallel infrastructure unless they truly need it.

### 4. Internal state is data-oriented, not object-oriented

This is the most important simplification signal.

SWR prefers:

- tuples
- plain records
- tiny helper functions

over:

- stateful service objects
- wide method surfaces
- multi-layer indirection between a module and the provider-scoped runtime state

That makes the internals feel denser in the base hook, but the system shape stays small.

## Where `swrv-next` Added Necessary Complexity

Some complexity is justified and should not be simplistically removed.

### Vue-native response model

`swrv-next` returns separate refs:

- `data`
- `error`
- `isLoading`
- `isValidating`

That means the implementation needs explicit ref synchronization, unlike SWR’s React snapshot-and-render model.

### Effect-scope lifecycle

Vue composition APIs require:

- setup-scope safety
- watcher cleanup
- effect-scope disposal

These are real runtime concerns, not optional abstraction.

### SSR snapshot helpers

The current SSR design includes:

- `serializeSWRVSnapshot()`
- `hydrateSWRVSnapshot()`
- server-safe `preload()`
- strict server prefetch warnings

This is broader than SWR’s pure React SSR path, but it is a legitimate Vue library concern.

### Compatibility extensions

`ttl` is intentionally preserved as a compatibility-oriented feature. That adds branchiness and tests that upstream SWR does not carry.

### Vue-specific public typing

The type surface has to describe:

- refs
- nullable key sources
- positional tuple fetchers
- Vue component config props

That is legitimate domain complexity.

## Where `swrv-next` Added Accidental Complexity

These are the best candidates for simplification.

### 1. `SWRVClient` is too rich

Current issue:

- `_internal/client.ts` exposes a large, custom runtime API
- multiple modules call into that object directly
- advanced APIs know too much about internal client capabilities

Why this is probably accidental:

- upstream SWR represents the same state with a much thinner provider-global-state model
- most `SWRVClient` methods are just small wrappers around provider-scoped maps and cache writes

Why it matters:

- every new feature tends to add more client methods or more client coupling
- it raises the conceptual minimum for contributors
- it makes the runtime feel “framework-like” instead of helper-oriented

### 2. `config.ts` does too many jobs

Current file responsibilities:

- default configuration values
- merge logic
- provider and client creation
- `SWRVConfig` component
- `useSWRVContext`
- `useSWRVConfig`
- cache provider creation

Why this is accidental:

- SWR splits these concerns into separate utilities
- the current file is effectively part defaults, part dependency injection container, part public accessor layer

### 3. `use-swrv.ts` mixes public overloads and internal runtime logic

Current file responsibilities:

- type overload surface
- argument normalization
- middleware composition
- key tracking
- request lifecycle
- auto revalidation
- state projection
- bound mutate
- SSR warning behavior

Why this is accidental:

- upstream SWR splits “public call resolution” from “hook handler” with `withArgs`
- the current file makes every change harder because type-level and runtime-level concerns are edited together

### 4. Helper identity caching is spread across modules

Examples:

- `getScopedMutator()` keeps a `WeakMap`
- `getScopedPreload()` keeps a `WeakMap`
- `useSWRVConfig()` assembles helpers again from context

This is not severe, but it is more moving pieces than necessary. These bound helpers could be owned by a thinner provider-state bundle instead of separate singleton stores.

### 5. Advanced APIs reach into internal storage too directly

Examples:

- `subscription` manages its own storage and writes through `client.setState`
- `infinite` manages separate size and revalidation storage outside the shared provider-state primitives

Some of that is unavoidable, but the current design makes each advanced API invent one more local storage subsystem instead of sharing a smaller common helper vocabulary.

### 6. Optional features are not isolated enough from the core path

Current examples:

- TTL support is part of the main cache state shape and write path
- devtools middleware hooks are part of normal hook composition
- SSR warning behavior lives in the base hook

These are reasonable features, but they could be pushed closer to optional layers or dedicated helper modules.

## Distilled Simplification Direction

The best simplification direction is not “make `swrv-next` tiny”.

It is:

### Keep

- provider-scoped state
- Vue ref return contract
- SSR snapshot helpers
- parity-correct request and mutation semantics
- the current public API

### Simplify

- replace the rich `SWRVClient` service layer with thinner provider-state helpers
- split config resolution from provider-state initialization
- split argument normalization and middleware application from the base handler
- reduce direct client-method coupling in advanced APIs
- isolate optional features away from the hottest code path

## Proposed Simplified Internal Model

Target shape:

### `provider-state.ts`

Own only the provider-scoped internal records:

- revalidators
- fetch lanes
- mutation timestamps
- preload store
- cache subscribers
- optional helper handles

This should be closer in spirit to SWR’s `SWRGlobalState`.

### `cache-helper.ts`

Provide the narrow operations the rest of the runtime actually needs:

- `getCacheState(key)`
- `setCacheState(key, patch)`
- `subscribeCache(key, callback)`
- maybe `getInitialSnapshot(key)` for SSR

This should be closer to SWR’s `createCacheHelper`.

### `config/defaults.ts`, `config/context.ts`, `config/merge.ts`

Break today’s `config.ts` into smaller units:

- defaults and web preset
- provider/context component
- merge logic
- public accessor helper

### `resolve-args.ts`

Mirror SWR’s `withArgs` idea:

- public `useSWRV(...)` should mostly normalize args, merge config, apply middleware, and call a handler
- the heavy runtime should live in a handler-oriented module

### `use-swrv-handler.ts`

Contain the base-hook runtime only:

- key activation
- fetch lifecycle
- error and retry behavior
- polling
- focus/reconnect events
- state projection into refs

### advanced APIs on shared helpers

`infinite`, `mutation`, and `subscription` should depend on:

- cache helper
- provider state
- bound mutate
- shared key-prefix helpers

not on a wide client method surface.

## What Should Not Be Simplified Away

- race handling around fetch and mutation ordering
- paused-state gating
- SSR-safe non-fetching behavior on the server
- cache-bound isolation per provider
- the current public type guarantees

These are part of correctness, not accidental complexity.

## Recommendation

Yes, there is room to simplify `swrv-next`.

The right interpretation is:

- the project is not obviously “too large” compared with SWR
- but its abstractions are heavier than they need to be
- the best next optimization lane is an architectural simplification pass that keeps semantics and tests intact while moving the internals closer to SWR’s smaller set of core ideas

The highest-value target is the `SWRVClient`-centric design. If that is simplified into a thinner provider-state plus helper model, much of the surrounding complexity should collapse with it.
