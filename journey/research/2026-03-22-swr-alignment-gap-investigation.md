# SWR Alignment Gap Investigation

Date: 2026-03-22
Status: completed

## Purpose

This note records a structure-first comparison between the current SWRV source
tree and the local SWR reference under:

- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src`

The goal is to catalog all remaining gaps in:

- API and concept shape
- naming
- module and file organization
- helper placement
- logic ownership

before making another broader SWR-alignment pass.

This is an investigation pass only. No runtime refactor decisions are taken
here beyond identifying what is intentional versus what is unnecessarily
different from SWR.

## Sources reviewed

### SWRV

- `packages/swrv/src/index.ts`
- `packages/swrv/src/config.ts`
- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/config-utils.ts`
- `packages/swrv/src/index/use-swrv.ts`
- `packages/swrv/src/index/use-swrv-handler.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/infinite/serialize.ts`
- `packages/swrv/src/infinite/state.ts`
- `packages/swrv/src/infinite/types.ts`
- `packages/swrv/src/mutation/index.ts`
- `packages/swrv/src/mutation/types.ts`
- `packages/swrv/src/subscription/index.ts`
- `packages/swrv/src/subscription/state.ts`
- `packages/swrv/src/_internal/*`

### SWR

- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/config.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/serialize.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/types.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/state.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/subscription/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/constants.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/events.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/*`

## Executive summary

The remaining drift is no longer mainly behavioral. It is now mostly structural.

The biggest gaps are:

1. `_internal` organization is still far from SWR.
2. Config and cache composition live in a public-facing SWRV-specific layer
   instead of an SWR-like internal config stack.
3. Built-in middleware composition and preload handling are not organized like
   SWR.
4. `infinite` still carries extra helper extraction and extra side stores that
   SWR keeps inline or in cached aggregate state.
5. `subscription` and recent internal-key handling are still organized
   differently from SWR.
6. Public and internal entrypoints do not mirror SWR closely enough yet.

The most important distinction for the next pass:

- some differences are required by Vue
- some are justified by the explicit `SWRVClient` model
- many others are merely local organization choices and can be moved closer to
  SWR without changing behavior

## Tree-level comparison

### SWRV-only files and modules

Files present in SWRV but not in SWR:

- `_internal/cache-helper.ts`
- `_internal/cache.ts`
- `_internal/client.ts`
- `_internal/key-prefix.ts`
- `_internal/provider-state.ts`
- `_internal/scoped-storage.ts`
- `_internal/server-prefetch-warning.ts`
- `_internal/ssr.ts`
- `config.ts`
- `config-context.ts`
- `config-utils.ts`
- `index.ts`
- `index/use-swrv.ts`
- `index/use-swrv-handler.ts`
- `infinite/state.ts`
- `subscription/state.ts`

These fall into two groups:

- intentional Vue-only or SWRV-only infrastructure:
  - provider-scoped client model
  - explicit SSR snapshot helpers
  - scope-keyed stores
- alignable organization drift:
  - top-level config files instead of SWR-like internal config stack
  - extra feature helper extraction

### SWR files and modules missing in SWRV

Files present in SWR but absent in SWRV:

- `_internal/constants.ts`
- `_internal/events.ts`
- `_internal/index.react-server.ts`
- `_internal/utils/cache.ts`
- `_internal/utils/config-context.ts`
- `_internal/utils/config.ts`
- `_internal/utils/global-state.ts`
- `_internal/utils/helper.ts`
- `_internal/utils/merge-config.ts`
- `_internal/utils/middleware-preset.ts`
- `_internal/utils/subscribe-key.ts`
- `_internal/utils/use-swr-config.ts`
- `index/config.ts`
- `index/index.ts`
- `index/index.react-server.ts`
- `index/use-swr.ts`
- `infinite/index.react-server.ts`
- `mutation/state.ts`

Not all of these should exist in Vue form, but the list shows where our
organization still diverges from SWR's source layout.

## Detailed gaps

## 1. `_internal` is still not the main composition surface

### SWR shape

SWR's [\_internal/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/index.ts)
is an active composition module. It:

- re-exports `SWRConfig`, default config, cache, mutate, and preload
- exports `INFINITE_PREFIX` and `revalidateEvents`
- exposes `withArgs`, `withMiddleware`, `mergeConfigs`, `useSWRConfig`
- runs `setupDevTools()` at module load

### SWRV shape

SWRV's [packages/swrv/src/\_internal/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/index.ts)
is mostly a passive type and utility barrel.

### Gap

SWR centralizes internal composition in `_internal`; SWRV keeps major pieces
outside it:

- config ownership in `config.ts`, `config-context.ts`, `config-utils.ts`
- public root mutate or preload helper creation in `src/index.ts`
- devtools discovery in `resolve-args.ts`
- SSR helpers as first-class public exports

### Assessment

This is a real structural gap. Even if some underlying machinery must stay
Vue-specific, the ownership model is less SWR-shaped than it could be.

## 2. Config and cache composition are split differently from SWR

### SWR shape

SWR keeps config and cache composition in:

- [\_internal/utils/config.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config.ts)
- [\_internal/utils/cache.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/cache.ts)
- [\_internal/utils/config-context.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config-context.ts)
- [\_internal/utils/use-swr-config.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/use-swr-config.ts)
- [\_internal/utils/merge-config.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/merge-config.ts)

### SWRV shape

Equivalent responsibilities are spread across:

- [packages/swrv/src/config-context.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/config-context.ts)
- [packages/swrv/src/config-utils.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/config-utils.ts)
- [packages/swrv/src/\_internal/client.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/client.ts)
- [packages/swrv/src/\_internal/provider-state.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/provider-state.ts)
- [packages/swrv/src/\_internal/cache-helper.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/cache-helper.ts)

### Gap

SWRV's config and cache composition is structurally heavier:

- explicit `SWRVClient` facade instead of SWR's `cache + mutate + global state`
- top-level public config modules instead of internal config modules
- no SWR-like `useSWRConfig()` internal hook returning only merged config
- no SWR-like `initCache()` single place for provider setup

### Assessment

This is the largest intentional architectural divergence.

Some of it is justified:

- Vue provider-scoped client state is explicit and public here
- SSR snapshot helpers benefit from that explicit client model

But some of the file placement is still alignable:

- we could move more config composition back under `_internal`
- we could mirror SWR's naming more closely (`mergeConfigs`, `use-swr-config`)
- we could add SWR-shaped wrapper files even if the underlying client model stays

## 3. Default config and preset composition are organized differently

### SWR shape

SWR splits browser defaults into:

- `preset`
- `defaultConfigOptions`

in [\_internal/utils/web-preset.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/web-preset.ts),
then builds `defaultConfig` in [\_internal/utils/config.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config.ts).

### SWRV shape

SWRV builds a fully merged
`INTERNAL_DEFAULT_CONFIGURATION` directly in
[packages/swrv/src/\_internal/web-preset.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/web-preset.ts).

### Gap

SWRV collapses preset and default-config layers into one module instead of
following SWR's two-step structure.

### Assessment

This is alignable and not Vue-required.

## 4. Built-in middleware composition is not SWR-shaped

### SWR shape

SWR centralizes built-in middleware through:

- [\_internal/utils/devtools.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/devtools.ts)
- [\_internal/utils/preload.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/preload.ts)
- [\_internal/utils/middleware-preset.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/middleware-preset.ts)
- [\_internal/utils/resolve-args.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/resolve-args.ts)

`withArgs()`:

- gets inherited config
- normalizes args
- merges config
- appends built-in middleware
- calls the hook with `fn || config.fetcher || null`

### SWRV shape

SWRV's [packages/swrv/src/\_internal/resolve-args.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/resolve-args.ts)
does less:

- gets context
- normalizes args
- concatenates devtools and config middleware ad hoc
- delegates config merging to the hook handler later

There is no `middleware-preset.ts`, and preload is not modeled as built-in
middleware. It is handled directly in:

- [packages/swrv/src/\_internal/preload.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/preload.ts)
- [packages/swrv/src/index/use-swrv-handler.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/index/use-swrv-handler.ts)
- [packages/swrv/src/infinite/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/index.ts)

### Gap

This is a major structural gap:

- no SWR-like built-in middleware preset
- no preload middleware
- config merging happens later and elsewhere
- devtools wiring happens per call instead of as `_internal` composition

### Assessment

Highly alignable. Probably one of the best next targets.

## 5. Base-hook entry flow is still organized differently

### SWR shape

Public base-hook shape:

- [src/index/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/index.ts)
- [src/index/config.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/config.ts)
- [src/index/use-swr.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts)

The main hook file owns both:

- `useSWRHandler`
- `SWRConfig` re-export
- root hook wrapping

### SWRV shape

Current shape:

- [packages/swrv/src/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/index.ts)
- [packages/swrv/src/config.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/config.ts)
- [packages/swrv/src/index/use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/index/use-swrv.ts)
- [packages/swrv/src/index/use-swrv-handler.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/index/use-swrv-handler.ts)

### Gaps

1. No SWR-like `index/index.ts` file as the main public index wrapper.
2. Config wrapper lives at top-level `config.ts`, not `index/config.ts`.
3. Hook implementation is split into `use-swrv.ts` plus `use-swrv-handler.ts`
   rather than SWR's single `use-swr.ts` core file.
4. File naming keeps the package-specific `swrv` suffix in internal filenames,
   while SWR keeps generic `use-swr`.

### Assessment

Items 1 and 2 are alignable.

Item 3 is partly stylistic: the extra split is not required by Vue.

Item 4 is also alignable if closer source naming is the priority.

## 6. `infinite` is one of the clearest remaining organization drifts

### SWR shape

SWR's infinite structure:

- [infinite/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/index.ts)
  owns most of the flow
- [infinite/serialize.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/serialize.ts)
  is tiny and only handles first-page serialization
- aggregate cache state carries `_i`, `_l`, `_r` metadata through
  `SWRInfiniteCacheValue`

### SWRV shape

SWRV's infinite structure:

- [packages/swrv/src/infinite/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/index.ts)
- [packages/swrv/src/infinite/serialize.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/serialize.ts)
- [packages/swrv/src/infinite/state.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/state.ts)

### Gaps

1. `infinite/serialize.ts` is larger than SWR's:
   - `createInfiniteCacheKey`
   - `serializePage`
   - `getInfinitePage`
   - `unstable_serialize`

2. Per-page serialization is delegated to `serialize.ts` instead of staying
   inline in `infinite/index.ts`.

3. Size and revalidation side state live in WeakMap stores in `infinite/state.ts`
   instead of the aggregate infinite cache entry.

4. `SWRInfiniteCacheValue`-style metadata is not a first-class part of the
   infinite type model in the same way it is in SWR.

### Assessment

Item 1 is strongly alignable.
Item 2 is strongly alignable.
Items 3 and 4 are more structural because they interact with the explicit
client/store model, but they are still legitimate drift.

## 7. `mutation` is close on behavior but not on source shape

### SWR shape

SWR keeps mutation-local state behavior in:

- [mutation/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/index.ts)
- [mutation/state.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/state.ts)

### SWRV shape

SWRV keeps all mutation-local state inline in:

- [packages/swrv/src/mutation/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/mutation/index.ts)

### Gaps

1. No feature-local `mutation/state.ts`.
2. Mutation imports `useSWRVConfig` from `../config` rather than using a more
   SWR-like internal config path.
3. State and closure tracking use plain refs and closure variables instead of a
   dedicated local helper module.

### Assessment

Gap 1 is mostly React-specific in SWR, because `mutation/state.ts` exists to
support React dependency-tracked local state. This is not a strong Vue
alignment target.

Gap 2 is an alignable import or boundary issue.

Gap 3 is intentional and acceptable in Vue.

## 8. `subscription` still has unnecessary organization drift

### SWR shape

SWR keeps subscription storage and prefix logic inline in
[subscription/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/subscription/index.ts).

### SWRV shape

SWRV currently splits these across:

- [packages/swrv/src/subscription/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/subscription/index.ts)
- [packages/swrv/src/subscription/state.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/subscription/state.ts)
- [packages/swrv/src/\_internal/key-prefix.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/key-prefix.ts)

### Gaps

1. Subscription ref-count storage is extracted into `subscription/state.ts`.
2. `$sub$` prefix handling is no longer local to the feature.
3. Shared internal-key detection for mutate is centralized rather than inline.

### Assessment

All three are alignable if the goal is stricter SWR structural parity.

## 9. Internal key handling currently matches SWR semantically but not structurally

### SWR shape

SWR:

- exports only `INFINITE_PREFIX` from [\_internal/constants.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/constants.ts)
- keeps `$sub$` local in subscription
- still knows about both internal key families in mutate via inline regex:
  [\_internal/utils/mutate.ts:70-80](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/mutate.ts#L70-L80)

### SWRV shape

SWRV currently centralizes both kinds in
[packages/swrv/src/\_internal/key-prefix.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/key-prefix.ts).

### Gap

This is structurally different even though the underlying need is the same.

### Assessment

Alignable. This is one of the cleanest low-risk reversions toward SWR shape.

## 10. Events and revalidation constants are still modeled differently

### SWR shape

SWR has:

- [\_internal/events.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/events.ts)
- `_internal/index.ts` re-exporting `revalidateEvents`

### SWRV shape

SWRV models events as:

- string literal unions in types
- string literals in runtime call sites

### Gap

No equivalent shared event-constant module.

### Assessment

Alignable. Not Vue-specific.

## 11. Devtools installation differs

### SWR shape

SWR:

- exports a static `use` array from devtools
- calls `setupDevTools()` in `_internal/index.ts`
- composes built-in middleware centrally

### SWRV shape

SWRV:

- uses `getDevtoolsUse()` as a dynamic accessor in
  [packages/swrv/src/\_internal/resolve-args.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/resolve-args.ts)
- does not have a middleware-preset module
- does not have `_internal/index.ts` as the active setup surface

### Gap

This is organizational drift, not a Vue requirement.

### Assessment

Alignable.

## 12. Preload flow differs more than the surface API suggests

### SWR shape

SWR preload module:

- exports `preload`
- exports `middleware`
- includes an `INFINITE_PREFIX` special case so infinite owns its own preload
  consumption

Relevant file:

- [\_internal/utils/preload.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/preload.ts)

### SWRV shape

SWRV preload module:

- exports typed root/scoped preload helpers
- stores preload state on `SWRVClient`
- base hook and infinite explicitly consume preload entries themselves

Relevant files:

- [packages/swrv/src/\_internal/preload.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/preload.ts)
- [packages/swrv/src/index/use-swrv-handler.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/index/use-swrv-handler.ts)
- [packages/swrv/src/infinite/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/index.ts)

### Gap

Logic placement differs significantly:

- SWR handles preload through built-in middleware
- SWRV handles preload directly inside fetch execution paths

### Assessment

This is one of the highest-value structural alignment candidates.

## 13. Naming drift still exists in helper APIs

Examples:

- SWR `mergeConfigs` vs SWRV `mergeConfiguration`
- SWR `useSWRConfig` vs SWRV public `useSWRVConfig`
- SWR `initCache` vs SWRV `createSWRVClient`
- SWR `createCacheHelper` tuple helper vs SWRV object helper
- SWR `use-swr.ts` vs SWRV `use-swrv.ts`

### Assessment

Some of this is package-name-specific and harmless.

Some of it is genuine structural drift:

- `mergeConfiguration` versus `mergeConfigs`
- missing `use-swr-config.ts` ownership point
- missing `initCache`-like composition point

## 14. Type organization is close enough at the public surface, but not internally

### SWR shape

SWR's [\_internal/types.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/types.ts)
is much larger and contains the internal tuple global-state model, internal
provider config, and React-facing state dependencies.

### SWRV shape

SWRV's [packages/swrv/src/\_internal/types.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/types.ts)
includes explicit `SWRVClient`, Vue refs, and provider-context types.

### Gap

This is mostly intentional. The main internal type-organization gap is not type
coverage but missing SWR-shaped internal modules that own those types.

### Assessment

Lower-value alignment target than the module-organization gaps above.

## 15. React-server file parallels are intentionally absent

Missing SWR files:

- `_internal/index.react-server.ts`
- `index/index.react-server.ts`
- `infinite/index.react-server.ts`

### Assessment

This is intentional and should stay different. SWRV has explicit snapshot
helpers instead of React server-component entry files.

## 16. Explicit SSR snapshot helpers are an intentional SWRV-only divergence

SWRV-only:

- [packages/swrv/src/\_internal/ssr.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/ssr.ts)
- [packages/swrv/src/\_internal/server-prefetch-warning.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/server-prefetch-warning.ts)

### Assessment

Intentional and should remain.

## Gap classification

### Strong alignment candidates

- restore SWR-shaped internal constants and event modules
- move built-in middleware composition toward SWR's `middleware-preset`
- move preload handling toward a built-in middleware model
- shrink `infinite/serialize.ts` back toward SWR's ownership split
- inline subscription storage and `$sub$` handling back into subscription
- create SWR-shaped wrapper files such as `index/index.ts` and `index/config.ts`
- make `_internal/index.ts` a more active composition surface

### Medium-value alignment candidates

- rename helpers toward SWR (`mergeConfigs`, `use-swr-config`)
- reduce top-level config file prominence in favor of internal ownership
- move config merging earlier in the hook call path, closer to SWR's `withArgs`

### Intentional differences that should remain

- explicit `SWRVClient`
- provider-scoped runtime maps and client methods
- Vue refs and watchers
- provide/inject config flow
- explicit SSR snapshot helpers
- no React server entry files
- no React dependency-tracking helper like `mutation/state.ts`

## Likely next-pass alignment targets

### P1

1. Reintroduce `_internal/constants.ts` with `INFINITE_PREFIX`.
2. Reintroduce `_internal/events.ts` and stop using bare string literals across
   runtime event calls.
3. Remove `_internal/key-prefix.ts`, move `$sub$` back into subscription, and
   inline internal-key skipping in mutate like SWR.
4. Reduce `infinite/serialize.ts` to SWR-like first-page serialization only.
5. Move per-page key serialization back into `infinite/index.ts`.

### P2

1. Introduce an SWR-shaped built-in middleware preset.
2. Move preload consumption toward SWR-like built-in middleware ownership.
3. Reshape `withArgs()` so config merge and built-in middleware application
   happen there, closer to SWR.

### P3

1. Add SWR-shaped wrapper files:
   - `src/index/index.ts`
   - `src/index/config.ts`
2. Decide whether to keep `use-swrv.ts` or move closer to `use-swr.ts`
   internally.
3. Reconsider whether `config.ts`, `config-context.ts`, and `config-utils.ts`
   should remain top-level or become more SWR-like internal modules with thin
   public re-export shims.

## Evidence references

- SWR active internal barrel:
  [\_internal/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/index.ts)
- SWRV passive internal barrel:
  [packages/swrv/src/\_internal/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/index.ts)
- SWR config stack:
  [\_internal/utils/config.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config.ts),
  [\_internal/utils/cache.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/cache.ts),
  [\_internal/utils/config-context.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config-context.ts),
  [\_internal/utils/use-swr-config.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/use-swr-config.ts)
- SWRV config stack:
  [packages/swrv/src/config-context.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/config-context.ts),
  [packages/swrv/src/config-utils.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/config-utils.ts),
  [packages/swrv/src/\_internal/client.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/client.ts)
- SWR built-in middleware composition:
  [\_internal/utils/middleware-preset.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/middleware-preset.ts),
  [\_internal/utils/resolve-args.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/resolve-args.ts),
  [\_internal/utils/preload.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/preload.ts)
- SWRV built-in middleware and preload drift:
  [packages/swrv/src/\_internal/resolve-args.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/resolve-args.ts),
  [packages/swrv/src/\_internal/preload.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/preload.ts),
  [packages/swrv/src/index/use-swrv-handler.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/index/use-swrv-handler.ts),
  [packages/swrv/src/infinite/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/index.ts)
- SWR infinite serialize split:
  [infinite/serialize.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/serialize.ts),
  [infinite/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/index.ts)
- SWRV infinite serialize split:
  [packages/swrv/src/infinite/serialize.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/serialize.ts),
  [packages/swrv/src/infinite/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/index.ts),
  [packages/swrv/src/infinite/state.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/infinite/state.ts)
- SWR subscription inline state:
  [subscription/index.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/subscription/index.ts)
- SWRV subscription split state:
  [packages/swrv/src/subscription/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/subscription/index.ts),
  [packages/swrv/src/subscription/state.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/subscription/state.ts)

## Bottom line

There is enough remaining structural drift to justify another SWR-focused
alignment pass.

The highest-value next step is not a random cleanup pass. It is a targeted
re-shaping of:

1. `_internal` composition
2. built-in middleware and preload flow
3. infinite helper placement
4. subscription and internal-key organization
5. entrypoint wrapper shape

Those are the areas where SWRV is still materially less SWR-shaped than it
needs to be, and most of that drift is organizational rather than Vue-required.
