# SWR implementation alignment evaluation

Date: 2026-03-19
Status: proposed

## Short answer

Yes, but selectively.

SWRV should align further with SWR in **module boundaries, helper decomposition, data-flow shape,
and naming of core concepts**. It should **not** try to become a literal line-by-line structural
port, because several parts of SWR’s implementation exist only to solve React problems that Vue
does not have.

The right target is:

- **reuse SWR’s architectural ideas**
- **reuse SWR’s file/module decomposition where it improves clarity**
- **do not reuse React-specific state and rendering mechanisms**

## What is already well aligned

The current SWRV runtime is already meaningfully closer to SWR than legacy SWRV.

### 1. Provider-scoped runtime state

SWR uses provider-scoped global state initialized from cache ownership.

SWRV now does the same conceptually:

- SWR:
  - `initCache`
  - provider-bound global state
  - cache, mutate, subscribe, revalidators, fetch/preload tracking
- SWRV:
  - [`_internal/provider-state.ts`](../../packages/swrv/src/_internal/provider-state.ts)
  - [`_internal/client.ts`](../../packages/swrv/src/_internal/client.ts)
  - provider-bound fetches, mutations, listeners, revalidators, preloads

That alignment is substantive, not cosmetic.

### 2. Thin public hook entry plus internal handler

SWR has:

- `index/index.ts`
- `index/use-swr.ts`

SWRV has:

- [`use-swrv.ts`](../../packages/swrv/src/use-swrv.ts)
- [`use-swrv-handler.ts`](../../packages/swrv/src/use-swrv-handler.ts)

This is already the right direction.

### 3. Feature families match SWR

The feature surface now mirrors SWR’s product structure:

- base hook
- immutable
- infinite
- mutation
- subscription
- `_internal`

### 4. Browser preset and config layering

SWR’s internal config structure is split across:

- config context
- config defaults
- web preset

SWRV now has the same general shape:

- [`config-context.ts`](../../packages/swrv/src/config-context.ts)
- [`config-utils.ts`](../../packages/swrv/src/config-utils.ts)
- [`_internal/web-preset.ts`](../../packages/swrv/src/_internal/web-preset.ts)

## Divergences that are necessary because of Vue

These should **not** be “aligned away”.

### 1. No React render-state dependency collection

SWR has React-specific state dependency tracking, getter-based response objects, and
`useSyncExternalStore`-driven snapshot selection.

SWRV should not copy that:

- Vue already tracks dependencies at the ref level
- SWRV returns separate refs directly
- we already explicitly decided not to port SWR’s dependency collection model

Trying to align here would add complexity without benefit.

### 2. No React lifecycle/state helpers

SWR uses React-specific helpers such as:

- `useSyncExternalStore`
- `useRef`
- `useMemo`
- `useCallback`
- `useLayoutEffect`
- `startTransition`
- `useStateWithDeps`

SWRV should not mirror those structures. Vue has different reactivity and effect-scope semantics.

### 3. No RSC / promise handoff / React suspense internals

SWR contains React Server Component and suspense-adjacent implementation paths that are inherently
React-specific. SWRV should continue to diverge there.

### 4. Explicit client object is reasonable in Vue

SWR’s provider state is thinner and more tuple-like. SWRV’s explicit `SWRVClient` object is not a
problem by itself.

In Vue and SSR-heavy boundary control, an explicit client object is a reasonable public primitive.
The important thing is that it stays thin.

## Divergences that still look like accidental architectural drift

These are the areas where more SWR alignment is still worthwhile.

### 1. The top-level file layout still drifts from SWR

SWR’s source tree is organized around:

- `index/`
- `mutation/`
- `subscription/`
- `infinite/`
- `_internal/utils/`

SWRV still has a flatter root for the base hook:

- `use-swrv.ts`
- `use-swrv-handler.ts`
- `config.ts`

This is not wrong, but it makes it harder to visually map the base-hook entry to SWR’s structure.

### 2. `_internal/types.ts` is still too central

SWR splits more types closer to feature modules:

- `mutation/types.ts`
- `subscription/types.ts`
- `infinite/types.ts`

SWRV still keeps too much in one large internal types file. That is a real maintainability cost.

### 3. Argument normalization and middleware composition are still SWRV-specific in shape

SWR has a very clear flow:

- normalize args
- resolve inherited config
- append built-in middleware
- apply middleware
- call handler

SWRV has the same pieces, but in a more custom arrangement:

- [`_internal/normalize.ts`](../../packages/swrv/src/_internal/normalize.ts)
- [`_internal/middleware-stack.ts`](../../packages/swrv/src/_internal/middleware-stack.ts)
- `useSWRVContext()` + manual resolution in the hook entry

This is a good candidate for closer SWR-style shaping.

### 4. `client.ts` may still own more than it needs to

After the simplification pass and TTL removal, `createSWRVClient()` is much better, but it still
looks more service-oriented than SWR’s thin cache-global-state setup.

That does not mean “copy SWR’s tuple design”. It means we should continue pushing toward:

- dumb provider state
- thin cache helper
- thin client facade
- fewer cross-module “manager” responsibilities

### 5. Base-hook naming still partially reflects SWRV rather than SWR

Names like:

- `normalizeHookArgs`
- `resolveMiddlewareStack`
- `applyFeatureMiddleware`

work, but they do not line up as cleanly with SWR’s internal vocabulary:

- `normalize`
- `withArgs`
- `withMiddleware`
- `mergeConfig`

Some of this is low-value churn, but some is real clarity gain.

## Recommendation

We should **align further with SWR’s implementation design**, but only in the following ways:

### Align more

- module boundaries
- file layout for the base-hook family
- helper decomposition
- argument resolution flow
- feature-local type placement
- naming of internal concepts when SWR’s names are clearer

### Do not align more

- React render-state machinery
- dependency collection
- React suspense/RSC internals
- tuple/global-state encodings when named structures are clearer in TypeScript and Vue

## Practical target

The best next target is **SWR-shaped architecture with Vue-native runtime mechanics**.

That means:

- follow SWR’s “how the code is split” more closely
- keep Vue’s “how state is observed and propagated” model

## High-value next moves

### 1. Introduce a `withArgs`-style entry flow

Refactor the base and feature entries so they share one clearer pipeline:

1. normalize public args
2. read inherited config
3. merge config
4. append built-in middleware
5. apply middleware
6. call feature handler

This is one of SWR’s best internal ideas and maps well to Vue.

### 2. Split feature-local types out of `_internal/types.ts`

Move feature-specific types closer to:

- `mutation/`
- `subscription/`
- `infinite/`

Keep only genuinely shared core types in `_internal/types.ts`.

### 3. Reorganize the base hook under an `index/` family

A possible target:

- `index/index.ts`
- `index/use-swrv.ts`
- `index/serialize.ts`

That would make it much easier to compare SWRV and SWR mechanically.

### 4. Continue thinning the client/config seams

Not by removing the explicit client, but by making its ownership narrower and more obviously
provider-bound.

## What not to do

- Do not chase exact filename parity if it only causes churn.
- Do not port React-only abstractions just because they exist upstream.
- Do not replace named provider-state structures with SWR’s tuple-style storage if it hurts
  readability.

## Final recommendation

Yes, we should align further with SWR’s implementation design.

But the right rule is:

> copy SWR’s architecture where it clarifies the code, and stop at the point where the remaining
> differences are fundamentally React versus Vue.

That will give us a codebase that is easier to compare with upstream SWR, easier to maintain, and
still genuinely Vue-native.
