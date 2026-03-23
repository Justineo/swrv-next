# SWR v2.4.1 Full Alignment Epic Log

Date: 2026-03-23

- Confirmed upstream baseline from official sources:
  - `vp info swr version` -> `2.4.1`
  - local reference repo `/Users/yiling.gu@konghq.com/Developer/Justineo/swr`
    is at `v2.4.1` commit `5fa29522f196db2ad9d2083193c3b63214256c19`
- Read `journey/design.md`, the previous alignment plans, and the 2026-03-22
  gap investigation before starting the new epic.
- Initial compare pass suggests the remaining non-Vue-required drift is now
  concentrated in:
  - small export and alias ownership mismatches in base entrypoints
  - `immutable/index.ts` wrapper structure
  - base-hook fetch cleanup and stale-request finalization paths
  - possible smaller lifecycle or cache-metadata differences in feature wrappers
- Tracker created at
  `journey/plans/2026-03-23-swr-v241-full-alignment-epic.md`.
- Completed the main alignment pass with code changes in:
  - `packages/swrv/src/_internal/provider-state.ts`
  - `packages/swrv/src/_internal/types.ts`
  - `packages/swrv/src/index/use-swrv-handler.ts`
  - `packages/swrv/src/immutable/index.ts`
  - `packages/swrv/src/index/config.ts`
  - `packages/swrv/src/index/index.ts`
  - `packages/swrv/src/mutation/index.ts`
  - `packages/swrv/src/subscription/index.ts`
- The concrete SWR-alignment changes in this pass were:
  - provider listeners and revalidators now use ordered callback lists again,
    and shared-key broadcast paths now dispatch through the first registered
    revalidator like SWR
  - focus and reconnect initializers now defer revalidation through
    `setTimeout`, matching SWR's event timing
  - base-hook retries now clear failed fetch dedupe records, stale/discarded
    revalidations now clear loading flags before returning, and retry flow now
    goes back through `ERROR_REVALIDATE_EVENT`
  - generic `revalidate()` no longer applies extra hidden/offline gating outside
    the SWR-specific focus, reconnect, and polling paths
  - immutable middleware now follows SWR's in-place config override style
  - subscription no longer injects extra revalidation overrides on top of the
    null-fetcher base-hook path
  - mutation latest-result guards now use timestamp semantics again
- Updated tests to match the upstream-aligned behavior:
  - shared-key focus revalidation now reflects SWR's first-registered-hook rule
  - provider event tests now wait for the deferred focus/reconnect macrotask
  - client cleanup tests now assert callback-list lengths instead of `Set.size`
  - added a regression test proving retries are not deduped against a failed
    request record
- Validation passed:
  - `vp check packages/swrv/src packages/swrv/tests packages/swrv/e2e packages/swrv/scripts packages/swrv/vite.config.ts packages/swrv/package.json packages/swrv/README.md packages/swrv/tsconfig.json`
  - `vp test packages/swrv/tests`
- Follow-up after review feedback:
  - moved the real provider-boundary implementation from top-level
    `config-context.ts` onto the SWR-shaped
    `packages/swrv/src/_internal/utils/config-context.ts` path
  - reduced top-level `config-context.ts` and `config-utils.ts` back to
    wrapper-style ownership so the actual provider logic now sits under
    `_internal/utils`
  - moved the straightforward utility implementations onto the SWR-shaped
    `_internal/utils/*` files and turned the flat `_internal/*` siblings into
    wrappers again
  - switched the main feature codepaths to consume the `_internal/utils/*`
    owners directly
  - restored SWRV naming in source code for local identifiers after the user
    called out that the earlier pass had started renaming them toward SWR
  - aligned the functional `SWRVConfig` control path more literally with SWR by
    removing the default-config merge from inside `config-context` and pushing
    default filling back to the accessor path
  - switched more internal feature imports off the public or flat wrappers and
    onto the `_internal/utils/*` owners directly
  - confirmed the next open implementation-drift class: SWR's render-time
    merged-config delivery still differs from SWRV's setup-time middleware
    construction path in `withArgs`
  - reran `vp check ...` and `vp test packages/swrv/tests` after the refactor;
    both still pass
- Current file-by-file audit progress:
  - completed the full loop for these `_internal/utils/*` files:
    - `cache.ts`
    - `config-context.ts`
    - `config.ts`
    - `devtools.ts`
    - `env.ts`
    - `hash.ts`
    - `helper.ts`
    - `merge-config.ts`
    - `middleware-preset.ts`
    - `mutate.ts`
    - `normalize-args.ts`
    - `preload.ts`
    - `serialize.ts`
    - `shared.ts`
    - `timestamp.ts`
    - `use-swr-config.ts`
    - `web-preset.ts`
    - `with-middleware.ts`
  - `resolve-args.ts` remains open in the file-by-file plan for the next deeper
    implementation audit
  - completed the flat-wrapper cleanup loop by deleting the redundant
    `_internal/*.ts` siblings for the SWR-shaped utility owners after switching
    the remaining imports and tests to `_internal/utils/*`
  - completed the `_internal/events.ts` review loop by removing the extra
    string-event normalization path and switching internal tests to the numeric
    event constants like SWR
  - completed the `_internal/index.ts` and client/provider review loop by:
    - deleting `cache-helper.ts` after moving its ownership fully into
      `_internal/utils/helper.ts`
    - narrowing `getFetch()` down to the live in-flight-record semantics the
      runtime actually uses
    - tightening `_internal/index.ts` further toward SWR's internal composition
      surface
  - completed the wrapper-only review loop for:
    - `config-context.ts`
    - `config-utils.ts`
    - `config.ts`
    - `index.ts`
    - `index/config.ts`
    - `index/index.ts`
    - `index/serialize.ts`
    - `index/use-swr-handler.ts`
    - `index/use-swrv.ts`
  - completed the Vue-only review loop for:
    - `_internal/scoped-storage.ts`
    - `_internal/server-prefetch-warning.ts`
    - `_internal/ssr.ts`
  - completed the final substantive review loop for:
    - `_internal/utils/resolve-args.ts`
    - `_internal/types.ts`
    - `index/use-swr.ts`
    - `index/use-swrv-handler.ts`
    - `infinite/index.ts`
  - for those files, the remaining differences were reviewed as minimal
    Vue-required translations rather than unworked drift:
    - live provider updates require `resolve-args` plus base-hook config
      delivery to stay setup-time outside and ref-driven inside
    - `_internal/types.ts` intentionally keeps explicit `SWRVClient`, Vue ref
      response shapes, and SSR snapshot types
    - `index/use-swr.ts` intentionally carries the broader Vue key-source and
      fallback-aware overload surface
    - `index/use-swrv-handler.ts` remains the Vue runtime translation of
      SWR's base hook lifecycle
    - `infinite/index.ts` remains the Vue watcher/ref translation of SWR's
      infinite pagination lifecycle
