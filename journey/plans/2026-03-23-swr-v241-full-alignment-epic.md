# SWR v2.4.1 Full Alignment Epic

Date: 2026-03-23
Status: in progress
Upstream baseline: `swr@2.4.1` (`v2.4.1`, commit `5fa29522f196db2ad9d2083193c3b63214256c19`)

Companion audit plan:

- `journey/plans/2026-03-23-file-by-file-swr-audit-plan.md`

## Goal

Align `packages/swrv/src` with SWR 2.4.1 as literally as possible, keeping only
the minimum differences required by Vue runtime semantics, Vue refs and effect
scopes, and SWRV's explicit client or SSR snapshot model.

## Tracker

### M1. Internal entrypoint and config stack

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/index.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config-context.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/use-swr-config.ts`
- SWRV modules:
  - `packages/swrv/src/_internal/index.ts`
  - `packages/swrv/src/_internal/config.ts`
  - `packages/swrv/src/config-context.ts`
  - `packages/swrv/src/config.ts`
  - `packages/swrv/src/index/config.ts`
  - `packages/swrv/src/index/index.ts`
- Plan:
  - verify `_internal` remains the composition surface and remove easy alias
    drift that is not Vue-required
- Implement:
  - moved the actual provider-boundary implementation into
    `packages/swrv/src/_internal/utils/config-context.ts`
  - turned top-level `config-context.ts` back into a wrapper and reduced
    `config-utils.ts` to wrapper-style exports instead of owning provider logic
  - aligned the functional `SWRVConfig` branch more literally with SWR:
    provider-level config resolution now keeps the function result direct
    instead of default-merging inside `config-context`, and default filling now
    happens through the config accessor path
  - moved the straightforward utility implementations back onto the SWR-shaped
    `_internal/utils/*` paths instead of keeping them in flat `_internal/*`
    files:
    - `cache`
    - `config-context`
    - `config`
    - `devtools`
    - `env`
    - `hash`
    - `helper`
    - `merge-config`
    - `middleware-preset`
    - `mutate`
    - `normalize-args`
    - `preload`
    - `resolve-args`
    - `serialize`
    - `shared`
    - `timestamp`
    - `use-swr-config`
    - `web-preset`
    - `with-middleware`
  - switched the main feature codepaths to import those `_internal/utils/*`
    owners directly where the SWR tree has them
  - repointed `packages/swrv/src/index/config.ts` to source `SWRConfig` through
    `_internal/utils/config-context`
  - tightened `packages/swrv/src/index/index.ts` to follow SWR's default-hook
    naming and `SWRGlobalConfig` naming
- Review:
  - the reviewed `config-context` branch flow is now closer to SWR at both the
    ownership and implementation level
- Feedback:
  - closed the remaining config-alias mismatch
  - closed the remaining `config-context` ownership drift the follow-up review
    surfaced
  - restored SWRV naming inside source code where the earlier pass had switched
    local identifiers to SWR names
- Remaining gaps:
  - explicit `SWRVClient`, `provider-state`, and `cache-helper` still replace
    SWR's `global-state`, `subscribe-key`, and `helper` mechanics with a
    Vue-specific client model
  - flat `_internal/*.ts` wrappers still exist as compatibility indirection even
    though the main ownership now lives in `_internal/utils/*`
  - top-level `config.ts`, `config-context.ts`, `config-utils.ts`, and
    `index.ts` still exist as SWRV-facing wrapper layers above the SWR-shaped
    internal tree
  - snapshot SSR helpers and server-prefetch warning modules remain intentional
    Vue-specific extensions
- Status: completed

### M2. Cache, provider state, and event wiring

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/cache.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/global-state.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/helper.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/subscribe-key.ts`
- SWRV modules:
  - `packages/swrv/src/_internal/cache.ts`
  - `packages/swrv/src/_internal/client.ts`
  - `packages/swrv/src/_internal/provider-state.ts`
  - `packages/swrv/src/_internal/cache-helper.ts`
  - `packages/swrv/src/_internal/types.ts`
- Plan:
  - make provider-scoped revalidator and listener behavior follow SWR's ordered
    callback semantics instead of extra SWRV behavior
- Implement:
  - changed provider listener and revalidator storage from `Set` to ordered
    arrays
  - changed provider event dispatch to call only the first registered
    revalidator per key, matching SWR's shared-key behavior
  - wrapped focus and reconnect broadcasts in `setTimeout`, matching SWR's
    deferred event triggering
- Review:
  - shared-key revalidator cleanup, focus/reconnect dispatch timing, and client
    cleanup semantics now match the reviewed SWR control flow
- Feedback:
  - updated cleanup and provider-event tests to assert array lengths and delayed
    broadcast timing
- Remaining gaps:
  - `SWRVClient` remains the intentional Vue replacement for SWR's cache-keyed
    global-state weak map
- Status: completed

### M3. Shared helpers and middleware plumbing

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/constants.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/events.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/normalize-args.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/resolve-args.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/with-middleware.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/serialize.ts`
- SWRV modules:
  - `packages/swrv/src/_internal/constants.ts`
  - `packages/swrv/src/_internal/events.ts`
  - `packages/swrv/src/_internal/normalize-args.ts`
  - `packages/swrv/src/_internal/resolve-args.ts`
  - `packages/swrv/src/_internal/with-middleware.ts`
  - `packages/swrv/src/_internal/serialize.ts`
- Plan:
  - re-review helper ownership and branch behavior after the structure-alignment
    passes
- Implement:
  - no helper-body changes were required beyond the retry-option threading used
    by the base-hook alignment
- Review:
  - helper boundaries remain aligned; no additional safe non-Vue drift was found
    in this pass
- Feedback:
  - no new feedback after review
- Remaining gaps:
  - Vue ref resolution and fetcher invocation translation in `serialize.ts`
    remain intentional
- Status: completed

### M4. Base hook runtime

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts`
- SWRV modules:
  - `packages/swrv/src/index/use-swr.ts`
  - `packages/swrv/src/index/use-swr-handler.ts`
  - `packages/swrv/src/index/use-swrv-handler.ts`
- Plan:
  - align fetch cleanup, discard paths, error-retry control flow, and
    shared-key event handling branch-by-branch
- Implement:
  - removed non-SWR visibility and online gating from the generic `revalidate()`
    path so manual, mount, mutate, and retry revalidation behave like upstream
  - stale or discarded fetch completions now clear `isLoading` and
    `isValidating` before returning, matching SWR's final-state path
  - failed fetches now invalidate the dedupe record immediately before retry
  - retry revalidation now rebroadcasts through `ERROR_REVALIDATE_EVENT`,
    matching SWR's event path more closely
- Review:
  - the reviewed branches now line up with SWR's fetch lifecycle and stale-race
    handling
- Feedback:
  - added regression coverage for retrying inside a non-zero dedupe window
  - updated the shared-key focus test to reflect SWR's first-registered-hook
    behavior
- Remaining gaps:
  - Vue refs, watchers, effect-scope cleanup, and the explicit lack of React
    suspense or `useSyncExternalStore` remain intentional
- Status: completed

### M5. Public base entrypoints and compatibility shims

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/index.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/config.ts`
- SWRV modules:
  - `packages/swrv/src/index/index.ts`
  - `packages/swrv/src/index/config.ts`
  - `packages/swrv/src/index/use-swrv.ts`
  - `packages/swrv/src/index/use-swr-handler.ts`
  - `packages/swrv/src/index.ts`
- Plan:
  - remove small public-entrypoint naming and ownership drift while preserving
    compatibility shims
- Implement:
  - aligned `index/index.ts` naming around `useSWR` and `SWRGlobalConfig`
  - kept SWRV-specific aliases only as compatibility additions on top of the
    SWR-shaped entrypoints
- Review:
  - no additional non-Vue-required export drift was identified in this pass
- Feedback:
  - none beyond the completed entrypoint cleanup
- Remaining gaps:
  - top-level SWRV compatibility aliases and snapshot exports remain intentional
    compatibility and Vue SSR surface
- Status: completed

### M6. Immutable

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/immutable/index.ts`
- SWRV modules:
  - `packages/swrv/src/immutable/index.ts`
- Plan:
  - match SWR's middleware wrapper and in-place config override style
- Implement:
  - rewrote the immutable middleware to mutate the config object in place like
    SWR and switched it to the SWR-shaped `withMiddleware(useSWR, immutable)`
    flow
- Review:
  - immutable wrapper structure now matches the reviewed SWR file as closely as
    Vue permits
- Feedback:
  - no follow-up issues after the rewrite
- Remaining gaps:
  - the exported response still carries Vue refs
- Status: completed

### M7. Infinite

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/index.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/serialize.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/types.ts`
- SWRV modules:
  - `packages/swrv/src/infinite/index.ts`
  - `packages/swrv/src/infinite/serialize.ts`
  - `packages/swrv/src/infinite/types.ts`
- Plan:
  - compare mount semantics, metadata cache layout, page loading, mutate, and
    `setSize()` flow against SWR
- Implement:
  - no code changes were required in this pass
- Review:
  - no further safe non-Vue-required drift was confirmed in the reviewed
    infinite paths after the earlier structure-alignment work
- Feedback:
  - no feedback remained after review
- Remaining gaps:
  - Vue ref returns and explicit client access remain the intentional runtime
    translation
- Status: completed

### M8. Mutation

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/index.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/state.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/types.ts`
- SWRV modules:
  - `packages/swrv/src/mutation/index.ts`
  - `packages/swrv/src/mutation/types.ts`
- Plan:
  - align latest-result guards and reset behavior with SWR's timestamp-based
    logic
- Implement:
  - replaced the local version counter with SWR-style timestamp guards for
    trigger/reset result discarding
- Review:
  - no additional non-Vue-required mutation drift was found in this pass
- Feedback:
  - no further follow-up after the timestamp guard change
- Remaining gaps:
  - Vue ref state holders still replace React's `useStateWithDeps` and
    `startTransition`
- Status: completed

### M9. Subscription

- SWR references:
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/subscription/index.ts`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/subscription/types.ts`
- SWRV modules:
  - `packages/swrv/src/subscription/index.ts`
  - `packages/swrv/src/subscription/types.ts`
- Plan:
  - remove extra subscription wrapper config overrides that SWR does not apply
- Implement:
  - stopped forcing `revalidateIfStale`, `revalidateOnFocus`, and
    `revalidateOnReconnect` off inside the subscription wrapper, so it now
    relies on the null-fetcher base-hook path like SWR
- Review:
  - storage, ref-counting, prefixed-key ownership, and next-handler flow now
    match the reviewed SWR structure closely
- Feedback:
  - no remaining issues after the wrapper cleanup
- Remaining gaps:
  - Vue `watch()` cleanup is still the intentional replacement for React's
    effect lifecycle
- Status: completed

### M10. Vue-only modules and intentional gaps

- SWRV modules:
  - `packages/swrv/src/_internal/ssr.ts`
  - `packages/swrv/src/_internal/server-prefetch-warning.ts`
  - `packages/swrv/src/_internal/env.ts`
  - `packages/swrv/src/_internal/devtools.ts`
  - `packages/swrv/src/index/use-swrv.ts`
- Plan:
  - document the modules that remain intentionally outside SWR's tree because
    they implement Vue-only SSR, warning, or compatibility behavior
- Implement:
  - no code changes were required
- Review:
  - these modules remain intentionally outside the direct SWR mirror
- Feedback:
  - no non-Vue-required feedback remained after review
- Remaining gaps:
  - explicit snapshot SSR helpers, server-prefetch warnings, Vue env helpers,
    and SWRV compatibility shims remain intentional
- Status: completed

## Exit criteria

- the current wrapper-ownership batch is complete
- the remaining deeper drift classes are explicitly tracked instead of being
  silently treated as closed
- all remaining gaps are explicitly marked as intentional Vue or compatibility
  differences
- validation passed:
  - `vp check packages/swrv/src packages/swrv/tests packages/swrv/e2e packages/swrv/scripts packages/swrv/vite.config.ts packages/swrv/package.json packages/swrv/README.md packages/swrv/tsconfig.json`
  - `vp test packages/swrv/tests`

## Remaining Drift Classes

### R1. Flat Internal Wrapper Layer

- Current state:
  - the real implementation now lives under `_internal/utils/*`, but the flat
    `_internal/*.ts` wrappers still exist
- Plan:
  - decide module-by-module whether those wrappers are still required for local
    compatibility or can be removed entirely with import updates
- Status: planned

### R2. Client-State Replacement for SWR Global-State Cluster

- Current state:
  - `client.ts`
  - `provider-state.ts`
  - `cache-helper.ts`
  - `scoped-storage.ts`
    replace SWR's:
  - `utils/cache.ts`
  - `utils/global-state.ts`
  - `utils/helper.ts`
  - `utils/subscribe-key.ts`
- Plan:
  - audit which parts are truly Vue-required and which can still be made closer
    to SWR's ownership and branch layout
- Status: planned

### R3. Top-Level Public Wrapper Layer

- Current state:
  - `src/config.ts`
  - `src/config-context.ts`
  - `src/config-utils.ts`
  - `src/index.ts`
    remain as extra SWRV wrapper layers above the SWR-shaped internal tree
- Plan:
  - review whether each wrapper is required by public compatibility or can be
    collapsed further without breaking the intended surface
- Status: planned

### R4. One-Shot Config Delivery vs SWR Render-Time Delivery

- Current state:
  - `withArgs` in `packages/swrv/src/_internal/utils/resolve-args.ts`
  - `withMiddleware` in `packages/swrv/src/_internal/utils/with-middleware.ts`
  - `useSWRVHandler` in `packages/swrv/src/index/use-swrv-handler.ts`
    still split config delivery differently from SWR because Vue composables run
    once in `setup()` instead of on every render
- Confirmed examples:
  - the functional `SWRVConfig` branch had been default-merging inside
    `config-context`; this batch fixed that
  - middleware construction still receives a setup-time config path rather than
    the exact render-time merged config delivery SWR gets in React
- Plan:
  - audit whether middleware and wrapper layers can receive a closer
    SWR-equivalent merged config shape without breaking Vue's live provider
    updates
- Status: planned
