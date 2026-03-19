# SWRV runtime structure alignment review

Date: 2026-03-19

## Scope

This review compares the current SWRV runtime under `packages/swrv/src` against the local SWR runtime under `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src`, focusing on internal module structure and design patterns rather than docs or user-facing copy.

The goal is not "make Vue look like React." The goal is to identify:

1. structural areas that are already aligned with SWR's design,
2. divergences that are justified by Vue semantics,
3. divergences that still look like accidental architectural drift and could be aligned further.

## Source modules reviewed

- SWR
  - `src/index/use-swr.ts`
  - `src/_internal/index.ts`
  - `src/_internal/utils/cache.ts`
  - `src/_internal/utils/config.ts`
  - `src/_internal/utils/config-context.ts`
  - `src/_internal/utils/global-state.ts`
  - `src/_internal/utils/helper.ts`
  - `src/_internal/utils/merge-config.ts`
  - `src/_internal/utils/middleware-preset.ts`
  - `src/_internal/utils/normalize-args.ts`
  - `src/_internal/utils/preload.ts`
  - `src/_internal/utils/resolve-args.ts`
  - `src/_internal/utils/use-swr-config.ts`
  - `src/_internal/utils/with-middleware.ts`
  - `src/infinite/index.ts`
  - `src/mutation/index.ts`
  - `src/subscription/index.ts`
- SWRV
  - `src/use-swrv.ts`
  - `src/use-swrv-handler.ts`
  - `src/config.ts`
  - `src/config-context.ts`
  - `src/config-utils.ts`
  - `src/_internal/index.ts`
  - `src/_internal/client.ts`
  - `src/_internal/provider-state.ts`
  - `src/_internal/cache-helper.ts`
  - `src/_internal/middleware-stack.ts`
  - `src/_internal/normalize.ts`
  - `src/_internal/preload.ts`
  - `src/infinite/index.ts`
  - `src/mutation/index.ts`
  - `src/subscription/index.ts`

## Executive summary

SWRV is already much closer to SWR than legacy SWRV was. The broad runtime shape is now recognizably SWR-like:

- provider-scoped state instead of process-wide singleton semantics,
- a thin public hook entry plus a heavier internal handler,
- dedicated subpath features for `immutable`, `infinite`, `mutation`, and `subscription`,
- shared internal modules for `serialize`, `preload`, `mutate`, `web-preset`, `timestamp`, `hash`, and `env`.

The biggest remaining gap is not feature structure. It is abstraction shape.

SWR still uses thinner, helper-oriented composition:

- `withArgs()` for argument normalization, config resolution, and middleware composition,
- `withMiddleware()` for feature wrapping,
- a plain cache provider plus a WeakMap-backed global state record,
- small utilities that each do one job.

SWRV still carries more custom runtime plumbing than SWR in three places:

- a richer `SWRVClient` facade around provider state,
- repeated per-feature middleware and config-resolution wiring,
- feature-local state that has been abstracted into generic `_internal` modules even when it is only used by a single feature.

## 1. Areas already aligned

### Provider-scoped runtime model

SWR scopes runtime state by cache provider through `initCache()` plus `SWRGlobalState`.
SWRV scopes runtime state by cache provider through `createSWRVClient()` plus provider-local maps in `provider-state.ts`.

These are different implementations of the same architectural idea:

- cache boundary owns dedupe state,
- cache boundary owns listeners and revalidators,
- cache boundary owns preload state,
- nested providers create isolated zones.

This is a strong alignment, not drift.

### Thin public entry + heavy internal hook handler

SWR splits public `useSWR` entry logic from `useSWRHandler`.
SWRV now does the same with `use-swrv.ts` and `use-swrv-handler.ts`.

That is the right structural direction, and it matches SWR's separation of:

- overload-heavy public API surface,
- normalized runtime implementation.

### Shared internal utility surface

Both runtimes now converge on a similar internal vocabulary:

- `serialize`
- `preload`
- `mutate`
- `web-preset`
- `env`
- `hash`
- `timestamp`
- config merging helpers

This matters because it means the runtime is now organized around the same conceptual boundaries as SWR, even when the exact implementation differs.

### Advanced APIs built as base-hook extensions

SWR's `infinite`, `mutation`, and `subscription` are not standalone runtimes. They are layered on top of the base hook model.
SWRV now follows the same general pattern:

- `infinite` builds aggregate behavior on top of the base request model,
- `mutation` delegates real cache updates through the shared mutate path,
- `subscription` reuses the base hook for cached data and error state.

The strongest alignment here is `infinite`: the current SWRV file is very close to SWR not just in public behavior but in overall flow.

### Browser preset and devtools as runtime helpers, not page code

Both projects keep focus/reconnect event wiring and devtools integration in shared internal runtime modules rather than distributing that logic across feature hooks.

## 2. Divergences that are probably necessary because of Vue

### Ref-based return contract instead of snapshot object dependency collection

SWR's core hook is designed around React render snapshots and selective property access. That is why `use-swr.ts` contains dependency collection and snapshot equality logic.

SWRV returns separate Vue refs:

- `data`
- `error`
- `isLoading`
- `isValidating`

That means Vue's own dependency tracking already gives the useful part of SWR's optimization model. Porting SWR's getter-based dependency collection would be React-shaped work with little value in Vue.

This divergence is necessary.

### Provide/inject context instead of React context hooks

SWR can rely on `useContext`, `useMemo`, and layout effects.
SWRV has to work inside Vue `setup()` and effect scopes, so provider wiring naturally uses:

- `provide` / `inject`,
- `computed`,
- `onScopeDispose`,
- scope validation in `useSWRVHandler`.

This is a real platform difference, not structural drift.

### Watch-driven key transitions and subscription lifecycles

SWR responds to key and config changes through React rerender and effect dependency semantics.
SWRV must explicitly watch reactive key sources and config changes.

That leads to Vue-native structures such as:

- stable serialized-key watchers in the base hook,
- watch-driven subscription setup and teardown,
- ref-backed local state for mutation status.

This is necessary.

### SSR and server-runtime entry differences

SWR has React-server-specific entry points and server-component-aware code paths.
SWRV instead has snapshot helpers and explicit SSR handoff utilities.

That divergence is necessary because Vue SSR and React server components are different products, not just different syntax.

### No `useSyncExternalStore`-style subscription model

SWR's base cache subscription model is partially shaped by React's external store contract.
SWRV can push cache changes directly into refs and watchers.

So the lack of a direct `createCacheHelper(...getSnapshot...)` equivalent is expected.

## 3. Divergences that still look like accidental architectural drift

### The `SWRVClient` facade is still heavier than SWR's provider state model

SWR's provider runtime is intentionally plain:

- cache provider,
- WeakMap state,
- a few helper functions over that state.

SWRV wraps the same concerns inside a multi-method `SWRVClient` object in `src/_internal/client.ts`, backed by `src/_internal/provider-state.ts`.

That facade is not wrong, but it still feels more service-oriented than SWR's design. It creates a second conceptual layer that callers have to learn:

- provider state maps,
- cache helper,
- client methods,
- helper identity caches.

SWR gets away with less.

This looks alignable. A thinner provider-state plus helper approach would preserve Vue semantics while reducing abstraction weight.

### Config resolution is still split across too many live runtime layers

SWR has a cleaner path:

- `normalize-args.ts`
- `use-swr-config.ts`
- `merge-config.ts`
- `resolve-args.ts` (`withArgs`)
- handler receives the resolved config

SWRV currently spreads that work across:

- `src/_internal/normalize.ts`
- `src/use-swrv.ts`
- `src/config-context.ts`
- `src/config-utils.ts`
- `src/use-swrv-handler.ts`

The strongest sign of drift is that `use-swrv.ts` resolves middleware from context, while `use-swrv-handler.ts` reads context again and merges config again.

That is more live plumbing than SWR needs.

This looks very alignable: SWRV could adopt a `withArgs()`-style wrapper that fully resolves inherited config, merged config, middleware, and fetcher before entering the handler.

### Middleware composition is repeated across feature modules

SWR has a compact pattern:

- `withMiddleware(useSWR, middleware)` for `immutable`
- same pattern for `mutation`
- same pattern for `subscription`
- same pattern for `infinite`

SWRV currently repeats the same wiring in several modules:

- read context,
- resolve middleware stack,
- call `applyFeatureMiddleware(...)`,
- invoke the wrapped feature hook.

This repetition exists in:

- `src/use-swrv.ts`
- `src/infinite/index.ts`
- `src/mutation/index.ts`
- `src/subscription/index.ts`

That is classic architectural drift. It is not caused by Vue.

SWRV can align further by standardizing on one wrapper pattern for feature hooks, likely closer to SWR's `withMiddleware()` design.

### Feature-local state has been abstracted into generic `_internal` modules even when it is only feature-local

SWR keeps some state very close to the feature that owns it:

- subscription ref-count storage lives in `subscription/index.ts`
- infinite page metadata logic lives in `infinite/index.ts`

SWRV extracted these into:

- `src/_internal/infinite-state.ts`
- `src/_internal/subscription-state.ts`
- `src/_internal/key-prefix.ts`

This improves reuse only a little, because these modules are still effectively owned by one or two features.

That makes the runtime more "modular" on paper, but also more indirect to read.

This looks like alignable simplification drift, not a Vue requirement.

### Helper identity caching in provider state is probably more machinery than SWR needs

SWR derives provider-scoped `mutate` directly from cache initialization.
SWRV stores stable helper identities in `client.state.helpers` and reuses them through:

- `src/_internal/mutate.ts`
- `src/_internal/preload.ts`

This is not obviously harmful, but it is another layer that exists mostly because the client facade exists.

If the client facade is simplified, this helper cache may collapse naturally too.

### `config-context.ts` still owns both context semantics and provider construction policy

In SWR, context and provider initialization are related but still cleaner to trace:

- context component decides inheritance,
- `initCache()` owns provider-state initialization,
- `mergeConfigs()` owns config merging.

SWRV's `config-context.ts` plus `config-utils.ts` still jointly own:

- context inheritance,
- functional config resolution,
- provider creation,
- cache extension rules,
- ownership and disposal decisions.

Some of that is unavoidable in Vue, but the boundary still feels denser than SWR's.

This is alignable, especially if provider initialization is pushed closer to a thinner provider-state helper.

## Net recommendation

Yes, SWRV can and should align further with SWR's implementation structure, but selectively.

The good rule is:

- keep SWR's module boundaries and helper-first composition where React is not the reason for the structure,
- keep Vue-native reactivity, scope, and SSR decisions where the platform truly differs.

## Best next alignment targets

If the goal is to make SWRV structurally closer to SWR without forcing React-shaped code into Vue, the highest-value targets are:

1. Introduce a `withArgs()`-style wrapper for `useSWRV`.
   - Normalize args, merge inherited config, resolve middleware, and inject the effective fetcher before entering `useSWRVHandler`.
   - Remove duplicated context/config work from `use-swrv-handler.ts`.

2. Replace repeated per-feature middleware wiring with a single `withMiddleware()`-style helper.
   - Use it across `immutable`, `infinite`, `mutation`, and `subscription`.
   - Collapse `applyFeatureMiddleware()` if it becomes redundant.

3. Thin `SWRVClient` into a plainer provider-state plus helper design.
   - Keep provider-scoped semantics.
   - Reduce the service-object feel.
   - Let cache state, revalidators, preload state, and helper derivation look more like SWR's `initCache()` plus `SWRGlobalState`.

4. Re-co-locate feature-only state.
   - Move `infinite-state.ts` and `subscription-state.ts` back closer to their owning features unless they become genuinely shared.
   - Keep `_internal` for real cross-feature runtime primitives.

5. Simplify config ownership boundaries.
   - Leave Vue `provide` / `inject` intact.
   - But push more merging and provider initialization into narrower helpers so `config-context.ts` becomes closer in spirit to SWR's `config-context.ts`.

## Bottom line

SWRV is already aligned with SWR at the architectural level that matters most:

- provider-scoped runtime,
- shared primitives,
- base-hook-centered feature layering,
- feature parity surface.

The remaining implementation gap is mostly about simplification and boundary choice, not missing concepts.

That means further alignment is realistic. The runtime does not need a rewrite to get there. It mainly needs a round of boundary tightening around:

- args and config resolution,
- middleware wrapping,
- provider-state abstraction weight,
- feature-local state placement.
