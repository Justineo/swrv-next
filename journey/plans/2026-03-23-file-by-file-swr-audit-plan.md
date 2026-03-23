# File-By-File SWR Audit Plan

Date: 2026-03-23
Status: in progress
Upstream baseline: `swr@2.4.1` (`v2.4.1`, commit `5fa29522f196db2ad9d2083193c3b63214256c19`)

## Goal

Run a literal file-by-file audit of `packages/swrv/src` against SWR 2.4.1 and
close every non-Vue-required drift in:

- module ownership
- local function design
- control flow
- branch behavior
- config delivery and merge semantics
- lifecycle and cleanup
- cache and provider behavior
- wrapper layering

## Rules

- SWR is the source of truth unless a difference is strictly required by Vue.
- Keep SWRV naming in source code. Do not rename local identifiers from SWRV to
  SWR just for cosmetic similarity.
- For each file, do the full loop:
  1. compare
  2. log drifts
  3. implement
  4. review again against SWR
  5. address feedback
  6. only then mark complete
- If a file has no direct SWR counterpart, compare it to the nearest upstream
  responsibility and document why it remains Vue-specific.

## Audit Method

For every file below, capture these questions in the epic tracker while
auditing:

- Does this file own the same responsibility as the SWR counterpart?
- Are the exported names and boundaries as close as possible without violating
  the SWRV naming rule?
- Does the implementation follow SWR's branch order and cleanup timing?
- Are config reads, cache reads, and helper calls happening at the equivalent
  points in control flow?
- If the file is a wrapper, is it required, or just drift?
- If the file is Vue-only, is the divergence minimal and documented?

## Execution Order

Audit in dependency order so each later file can rely on the earlier ownership
model being stable.

### Batch 1. SWR-Shaped Utility Owners

- [x] `packages/swrv/src/_internal/utils/cache.ts`
      SWR reference: `src/_internal/utils/cache.ts`
      Focus: cache initialization ownership, provider event setup, mutate binding.
- [x] `packages/swrv/src/_internal/utils/config-context.ts`
      SWR reference: `src/_internal/utils/config-context.ts`
      Focus: context value shape, functional config path, provider lifecycle,
      inherited provider behavior.
- [x] `packages/swrv/src/_internal/utils/config.ts`
      SWR reference: `src/_internal/utils/config.ts`
      Focus: default config construction, compare ownership, root cache and mutate
      exposure.
- [x] `packages/swrv/src/_internal/utils/devtools.ts`
      SWR reference: `src/_internal/utils/devtools.ts`
      Focus: built-in devtools registration, module-load side effects, Vue-specific
      substitutions.
- [x] `packages/swrv/src/_internal/utils/env.ts`
      SWR reference: `src/_internal/utils/env.ts`
      Focus: environment detection, slow-connection logic, browser capability
      helpers.
- [x] `packages/swrv/src/_internal/utils/hash.ts`
      SWR reference: `src/_internal/utils/hash.ts`
      Focus: stable-hash branch behavior, cycle handling, object identity cases.
- [x] `packages/swrv/src/_internal/utils/helper.ts`
      SWR reference: `src/_internal/utils/helper.ts`
      Focus: helper boundary ownership, helper-vs-client split, remaining drift from
      SWR helper bundle.
- [x] `packages/swrv/src/_internal/utils/merge-config.ts`
      SWR reference: `src/_internal/utils/merge-config.ts`
      Focus: merge precedence and special handling for `fallback` and `use`.
- [x] `packages/swrv/src/_internal/utils/middleware-preset.ts`
      SWR reference: `src/_internal/utils/middleware-preset.ts`
      Focus: built-in middleware order and devtools/preload composition.
- [x] `packages/swrv/src/_internal/utils/mutate.ts`
      SWR reference: `src/_internal/utils/mutate.ts`
      Focus: optimistic flow, rollback, revalidate trigger path, filter behavior,
      timestamp ordering.
- [x] `packages/swrv/src/_internal/utils/normalize-args.ts`
      SWR reference: `src/_internal/utils/normalize-args.ts`
      Focus: normalized public hook argument semantics.
- [x] `packages/swrv/src/_internal/utils/preload.ts`
      SWR reference: `src/_internal/utils/preload.ts`
      Focus: preload ownership, consumption, server no-op path, middleware wrapping.
- [x] `packages/swrv/src/_internal/utils/resolve-args.ts`
      SWR reference: `src/_internal/utils/resolve-args.ts`
      Focus: config delivery timing, middleware assembly, fetcher fallback path.
- [x] `packages/swrv/src/_internal/utils/serialize.ts`
      SWR reference: `src/_internal/utils/serialize.ts`
      Focus: key resolution, hash boundary, fetcher-arg preservation, Vue ref
      differences.
- [x] `packages/swrv/src/_internal/utils/shared.ts`
      SWR reference: `src/_internal/utils/shared.ts`
      Focus: minimal shared helper surface and branch behavior.
- [x] `packages/swrv/src/_internal/utils/timestamp.ts`
      SWR reference: `src/_internal/utils/timestamp.ts`
      Focus: timestamp semantics and race-order assumptions.
- [x] `packages/swrv/src/_internal/utils/use-swr-config.ts`
      SWR reference: `src/_internal/utils/use-swr-config.ts`
      Focus: default fill vs injected config, live provider updates, context read
      point.
- [x] `packages/swrv/src/_internal/utils/web-preset.ts`
      SWR reference: `src/_internal/utils/web-preset.ts`
      Focus: online state, visibility state, event initializer semantics, default
      retry timing.
- [x] `packages/swrv/src/_internal/utils/with-middleware.ts`
      SWR reference: `src/_internal/utils/with-middleware.ts`
      Focus: middleware wrapping semantics and wrapper-config delivery.

### Batch 2. Flat Internal Wrappers and Vue Replacements

- [x] `packages/swrv/src/_internal/cache-helper.ts`
      SWR reference: nearest `src/_internal/utils/helper.ts`
      Focus: determine whether this remains a justified Vue/client split or can be
      folded closer to SWR helper ownership.
- [x] `packages/swrv/src/_internal/cache.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/cache.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/client.ts`
      SWR reference: nearest `src/_internal/utils/global-state.ts` plus
      `src/_internal/utils/cache.ts`
      Focus: explicit client facade vs SWR global-state cluster, justified vs extra
      drift.
- [x] `packages/swrv/src/_internal/config-context.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/config-context.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/config.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/config.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/constants.ts`
      SWR reference: `src/_internal/constants.ts`
      Focus: event and prefix ownership.
- [x] `packages/swrv/src/_internal/devtools.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/devtools.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/env.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/env.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/events.ts`
      SWR reference: `src/_internal/events.ts`
      Focus: event constants and any extra normalization behavior.
- [x] `packages/swrv/src/_internal/hash.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/hash.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/index.ts`
      SWR reference: `src/_internal/index.ts`
      Focus: internal public surface, re-exports, setup side effects.
- [x] `packages/swrv/src/_internal/merge-config.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/merge-config.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/middleware-preset.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/middleware-preset.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/mutate.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/mutate.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/normalize-args.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/normalize-args.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/preload.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/preload.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/provider-state.ts`
      SWR reference: nearest `src/_internal/utils/cache.ts`,
      `src/_internal/utils/global-state.ts`, and `src/_internal/utils/subscribe-key.ts`
      Focus: listener store, fetch store, mutation markers, event attachment.
- [x] `packages/swrv/src/_internal/resolve-args.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/resolve-args.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/scoped-storage.ts`
      SWR reference: no direct counterpart
      Focus: verify whether it is still needed and truly Vue-specific.
- [x] `packages/swrv/src/_internal/serialize.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/serialize.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/server-prefetch-warning.ts`
      SWR reference: no direct counterpart
      Focus: keep minimal Vue SSR-specific divergence.
- [x] `packages/swrv/src/_internal/shared.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/shared.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/ssr.ts`
      SWR reference: no direct counterpart
      Focus: keep minimal Vue SSR snapshot divergence.
- [x] `packages/swrv/src/_internal/timestamp.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/timestamp.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/types.ts`
      SWR reference: `src/_internal/types.ts`
      Focus: type ownership, alias drift, SWRV-only extensions, wrapper surface.
- [x] `packages/swrv/src/_internal/use-swr-config.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/use-swr-config.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/web-preset.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/web-preset.ts`
      Focus: decide whether this wrapper remains necessary.
- [x] `packages/swrv/src/_internal/with-middleware.ts`
      SWR reference: wrapper-only relative to `src/_internal/utils/with-middleware.ts`
      Focus: decide whether this wrapper remains necessary.

### Batch 3. Top-Level Config and Public Wrapper Layer

- [x] `packages/swrv/src/config-context.ts`
      SWR reference: no top-level SWR counterpart
      Focus: public wrapper necessity and compatibility-only justification.
- [x] `packages/swrv/src/config-utils.ts`
      SWR reference: no top-level SWR counterpart
      Focus: wrapper necessity, external test/public API dependencies.
- [x] `packages/swrv/src/config.ts`
      SWR reference: no top-level SWR counterpart
      Focus: public config wrapper necessity and export shape.
- [x] `packages/swrv/src/index.ts`
      SWR reference: no direct top-level SWR counterpart
      Focus: root public API wrapper necessity and compatibility additions.

### Batch 4. Base Hook Surface

- [x] `packages/swrv/src/index/config.ts`
      SWR reference: `src/index/config.ts`
      Focus: config alias ownership and wrapper necessity.
- [x] `packages/swrv/src/index/index.ts`
      SWR reference: `src/index/index.ts`
      Focus: export ordering, alias surface, type exposure.
- [x] `packages/swrv/src/index/serialize.ts`
      SWR reference: `src/index/serialize.ts`
      Focus: `unstable_serialize` behavior and import path ownership.
- [x] `packages/swrv/src/index/use-swr-handler.ts`
      SWR reference: no direct SWR counterpart
      Focus: shim-only necessity; if retained, confirm wrapper-only role.
- [x] `packages/swrv/src/index/use-swr.ts`
      SWR reference: `src/index/use-swr.ts`
      Focus: public hook overloads, wrapper delivery, normalized call flow.
- [x] `packages/swrv/src/index/use-swrv-handler.ts`
      SWR reference: no direct SWR counterpart
      Focus: shim-only necessity; if retained, confirm wrapper-only role.
- [x] `packages/swrv/src/index/use-swrv.ts`
      SWR reference: no direct SWR counterpart
      Focus: shim-only necessity; if retained, confirm wrapper-only role.

### Batch 5. Feature Hooks

- [x] `packages/swrv/src/immutable/index.ts`
      SWR reference: `src/immutable/index.ts`
      Focus: middleware wrapper, config override branch behavior.
- [x] `packages/swrv/src/infinite/index.ts`
      SWR reference: `src/infinite/index.ts`
      Focus: page loading flow, metadata ownership, mount semantics, mutate and
      `setSize()` control flow.
- [x] `packages/swrv/src/infinite/serialize.ts`
      SWR reference: `src/infinite/serialize.ts`
      Focus: key derivation and prefix behavior.
- [x] `packages/swrv/src/infinite/types.ts`
      SWR reference: `src/infinite/types.ts`
      Focus: type ownership and SWRV-only divergence.
- [x] `packages/swrv/src/mutation/index.ts`
      SWR reference: `src/mutation/index.ts`
      Focus: trigger path, reset path, option merging, local state transitions.
- [x] `packages/swrv/src/mutation/types.ts`
      SWR reference: `src/mutation/types.ts`
      Focus: type ownership and SWRV-only divergence.
- [x] `packages/swrv/src/subscription/index.ts`
      SWR reference: `src/subscription/index.ts`
      Focus: subscription keying, ref-counting, next-handler path, cleanup.
- [x] `packages/swrv/src/subscription/types.ts`
      SWR reference: `src/subscription/types.ts`
      Focus: type ownership and SWRV-only divergence.

## Completion Standard

A file is only done when:

- its drifts are logged
- the code is aligned or the remaining drift is documented as Vue-required
- the updated file is re-reviewed against SWR
- any review feedback is addressed
- the tracker entry for that file moves to complete

## Companion Tracker

Use the active epic tracker for ongoing status updates and drift notes:

- `journey/plans/2026-03-23-swr-v241-full-alignment-epic.md`
