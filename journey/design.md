# SWRV Next Design Snapshot

Status: Post-docs-reset prerelease, ready for stable-release execution
Last updated: 2026-03-19

## Mission

Rebuild SWRV as a modern, well-maintained, Vue-native counterpart to SWR. The new project should treat SWR 2.4.1 as the primary behavioral and API reference, while expressing the result as idiomatic Vue composables and SSR-safe runtime primitives instead of a literal React port.

## Current State

- The repository now uses the intended monorepo shape:
  - `packages/swrv`
  - `packages/site`
- The root workspace is validated through `vp check`, `vp test`, `vp exec playwright test`, `vp run build -r`, `vp run ready`, `vp pm pack -- --json --dry-run`, and `vp pm publish -- --dry-run --access public --provenance --no-git-checks --tag next`.
- The `swrv` package now contains an initial provider-scoped runtime with:
  - `useSWRV`
  - `SWRVConfig`
  - `useSWRVConfig`
  - global `mutate`
  - global `preload`
  - `swrv/immutable`
  - `swrv/infinite`
  - `swrv/mutation`
  - `swrv/subscription`
- The base hook behavior has started to move closer to SWR semantics:
  - `revalidateOnMount` now only affects the initial activation, not later key changes
  - fallback data stays idle when revalidation is disabled
  - focus and reconnect revalidation now respect focus throttling and visibility/online state
  - hooks sharing the same key now still honor their own per-hook focus settings, so a focus-enabled consumer can revalidate shared data without forcing focus-disabled siblings to register the same behavior
  - error retries now survive refresh scheduling instead of being cleared immediately
  - the immutable entry point now disables polling by forcing `refreshInterval: 0`
  - `isPaused()` now gates mount, focus, reconnect, polling, and mutate-driven revalidation, and in-flight results are discarded while paused
  - bound `mutate()` now correctly treats a no-argument call as revalidation instead of mutating the cache to `undefined`
  - config-level `onSuccess` and `onError` callbacks now exist for base requests
  - config-level `isVisible()` and `isOnline()` overrides now participate in focus, reconnect, and active-state gating
  - config-level `onErrorRetry`, `onLoadingSlow`, and `onDiscarded` now exist for retry scheduling, slow-request signaling, and stale-response races
  - reactive provider config is now covered for latest lifecycle behavior as well, so later revalidations use the latest provider `onSuccess`, `onError`, `onErrorRetry`, and `onLoadingSlow` callbacks instead of stale closures
  - reactive provider `fetcher` updates are now covered too, so revalidation uses the latest shared fetcher reference from `SWRVConfig`
  - the request path now holds onto the exact in-flight promise instead of re-reading it through the dedupe window, which fixes `dedupingInterval: 0` flakiness
  - request and mutation ordering now use high-resolution timestamps, which avoids false stale-response discards when revalidation starts immediately after a mutation
  - fetches that start in the same tick as a finished mutation now nudge their ordering timestamp just past the mutation end marker, which preserves post-mutation revalidation without breaking concurrent dedupe at `dedupingInterval: 0`
  - local and global `mutate()` now explicitly invalidate the per-key fetch dedupe lane before broadcasting, so `mutate(key)` also clears stale dedupe state for future mounts even when no hook is currently mounted
  - mutate-triggered revalidation now also dedupes across hooks sharing the same key, so manual revalidation broadcasts no longer fan out into one fetch per mounted consumer
  - base and global mutate coverage now explicitly includes `rollbackOnError: false`, committed-snapshot `populateCache` transforms, function-style `revalidate`, and filter-based function revalidation
  - filter-based global `mutate()` now skips the internal `$inf$` and `$sub$` cache records so implementation details do not leak through the public key-filter path
  - preload requests now dedupe by serialized key, clear failed entries for retries, accept function and tuple keys with typed fetcher arguments, and are consumed by the first matching hook fetch
  - root and scoped `mutate()` and `preload()` helpers are now cached per client, so `useSWRVConfig()` returns stable helper identities and the default context exposes the exact shared root helpers
  - preload now also returns synchronous fetcher values immediately while still seeding the client preload store for the first matching hook fetch, and the public preload overloads now distinguish synchronous and asynchronous return shapes more precisely
  - cache-listener updates now consume the listener payload directly instead of re-reading cache for the active hook, and local cache writes no longer redundantly re-apply state when the active subscription already covers the key
  - cache write notifications are now normalized through the adapter's read path before listeners fire, so custom provider caches that transform `get()` results stay consistent for active hooks as well as later reads
  - key watchers for `useSWRV` and `useSWRVSubscription` now track stable serialized keys instead of fresh tuple objects, which avoids unnecessary reactivation, refetch, and resubscription work when reactive dependencies invalidate without changing the effective key
  - server rendering no longer starts base-hook or immutable-hook fetches; SSR hook usage now reads fallback or hydrated snapshot data only, with optional warnings for missing handoff data
  - polling timers now reschedule when provider-driven refresh settings change, including reactive `refreshInterval` updates and function-style intervals that derive their next delay from the latest data
  - focus throttling now compares with a strict `<` boundary, so `focusThrottleInterval: 0` no longer suppresses same-millisecond focus revalidation after mount
  - stale per-hook refresh completions no longer reset polling or fire hook-local success or error callbacks after the hook has switched to a different key, while cache updates for the old key still land for other consumers
  - synchronous fetcher throws are now normalized into rejected promises at the fetcher boundary, so `error`, retry, and callback semantics match asynchronous failures instead of leaking unhandled watcher errors
  - per-hook fetchers now accept `false` in addition to `null` and `undefined`, matching SWR's disabled-fetcher behavior in both runtime semantics and public typing
  - public hook entrypoints now support SWR-style normalized argument forms, so `useSWRV(key, config)` and `useSWRVImmutable(key, config)` can drive requests through `config.fetcher` instead of requiring a positional fetcher argument
  - `swrv/immutable` now also exposes the named `immutable` middleware, and immutable behavior coverage includes middleware-based focus suppression, ignoring provider-level `refreshInterval`, avoiding revalidation when a second immutable consumer mounts with cached data, and reusing cached keys without refetching when `revalidateIfStale` is false
  - `stableHash` now handles circular plain objects and arrays instead of overflowing recursion, which brings the serializer closer to SWR's upstream utility behavior
- The infinite and mutation helpers have also moved closer to SWR:
  - `swrv/infinite` now exposes `unstable_serialize`, resolves page keys safely, supports cursor-style sequential loading, and treats `setSize()` as a page-oriented operation instead of a raw aggregate refresh
  - `swrv/infinite` now revalidates the first page while loading new pages and lets no-arg `mutate()` revalidate all loaded pages
  - `swrv/infinite` now respects `revalidateFirstPage: false` while growing, uses cached data first in `setSize()`, and supports page-selective revalidation callbacks through bound `mutate(data, { revalidate })`
  - `swrv/infinite` now consumes preloaded page requests, including multiple preloaded pages in parallel mode
  - `swrv/infinite` now revalidates page entries when the aggregate infinite cache and per-page cache diverge after local mutation, which keeps later size growth aligned with SWR's aggregate/page cache model
  - `swrv/infinite` now also supports the SWR-style config-only call form via `config.fetcher`, so `useSWRVInfinite(getKey, { fetcher, ...config })` is a supported runtime path
  - infinite behavior coverage now includes `unstable_serialize` mutation paths, scoped custom-cache revalidation, null-key `setSize()` handling, fallback retention during size growth, page-cache sharing with plain `useSWRV` consumers, and SWR-style bound `mutate()` option behavior for `optimisticData`, `populateCache`, `rollbackOnError`, and `throwOnError`
  - `swrv/mutation` now guards local state against stale trigger results after `reset()` or a newer trigger, and it still records local error state when `throwOnError` is disabled
  - mutation behavior coverage now also includes original key plus arg delivery, hook-level and per-trigger success/error callbacks, `isMutating`, empty-key failures, shared-cache optimistic updates, cache isolation from plain `useSWRV`, clearing error state after a later successful trigger, non-deduped triggers, latest fetcher/config closure behavior, and falsey rejection handling
  - scoped `mutate()` now returns the actual mutation result even when `populateCache` is disabled
- The subscription helper has now received its first real parity pass:
  - `swrv/subscription` preserves fallback and last good data across subscription errors
  - it passes original keys through to handlers, deduplicates subscriptions per cache boundary, and enforces disposer return values
  - it now also covers singleton-style subscriptions that switch keys over time without keeping the previous callback wired up
  - it no longer conflicts with normal `useSWRV` state for the same logical key
- Public typing and package-shape coverage are now materially stronger:
  - `useSWRV` and `useSWRVImmutable` now infer array-key fetcher arguments more precisely
  - `useSWRV` and `useSWRVImmutable` now also preserve non-null fetcher argument types for nullable string and object keys, and accept readonly tuple keys in positional fetcher signatures
  - public compile-time coverage exists for root and subpath APIs
  - bound and scoped mutators now expose the mutation-result type instead of collapsing everything to cached-data type, and mutator callbacks can now model different output payloads from their input snapshot
  - `useSWRVInfinite` bound mutators now also accept mutation payload types distinct from the aggregate page-array shape, which keeps `populateCache` and optimistic transform flows type-safe for both single-page and multi-page cases
  - `useSWRVMutation` now models SWR-style trigger overloads more closely, including no-arg and optional-arg triggers, hook-level `throwOnError` defaults, and separate cache-data typing for `optimisticData` and `populateCache`
  - mutation type coverage now also explicitly checks no-arg trigger typing and ensures mutation responses do not leak base-hook fields like `mutate`
  - `useSWRVSubscription` handler keys now narrow to the resolved non-nullish key type even when the key source itself is conditional
  - per-hook `fallbackData` now narrows `data.value` to a defined ref type across base and immutable hooks, including both config-only and fetcher-plus-config call forms
  - root and scoped `preload()` now use overload-based typing instead of a single conditional generic, which improves string-key and config-driven preload inference while leaving tuple function-key inference as a smaller remaining follow-up
  - compile-time coverage now also exercises `useSWRVConfig()` accessors, filtered mutate callback typing, readonly tuple keys, nullable-key fetcher narrowing, config-bound provider hook typing, and bound-mutate composition with mutation triggers
  - the package export map now points at the emitted `.d.mts` declaration files and is checked by a package-export smoke test
  - the remaining non-suspense partial row in the upstream SWR and legacy SWRV test matrix is now closed; only the explicitly deferred suspense lane remains open
- The site package now builds with VitePress and has been rebuilt from scratch around the SWR docs source structure.
- The docs tree and nav now use SWR-shaped filenames and ordering, including:
  - `arguments.md`
  - `revalidation.md`
  - `middleware.md`
  - `mutation.md`
  - `prefetching.md`
  - `advanced/understanding.md`
- The site package now uses the default VitePress home layout, a SWR-shaped guide and advanced nav, a dedicated `Migrate from v1` page, and a Vue-first SSR and hydration guide built around provider-scoped clients, config-level `fallback`, and snapshot helpers.
- The site package now documents snapshot-based SSR handoff through `serializeSWRVSnapshot()` and `hydrateSWRVSnapshot()`, so the SSR story is no longer limited to manually wiring config-level `fallback`.
- The site package now targets the VitePress 2 prerelease line (`2.0.0-alpha.16`) instead of the VitePress 1 stable line so the docs stack stays on the intended forward-looking baseline.
- Under the VitePress 2 plus Rolldown path used here, the site package now also carries `oxc-minify` explicitly because VitePress requires it for production builds on that toolchain.
- Browser-facing end-to-end coverage now exists through a Playwright fixture app under `packages/swrv/e2e`, covering focus revalidation, reconnect revalidation, optimistic mutation UI, and subscription pushes in a real browser runtime.
- A first built-in devtools hook now exists through `window.__SWRV_DEVTOOLS_USE__`, which injects global middleware across `useSWRV` and middleware-based APIs, and exposes `window.__SWRV_DEVTOOLS_VUE__` for Vue-aware tooling.
- The test suite has now started splitting into domain files instead of a single monolith, with the first extracted `core-config-revalidate` coverage file carrying config fallback, focus, reconnect, retry, callback, and immutable revalidation behavior plus an upstream-inspired reactive `SWRVConfig` focus test.
- Upstream parity ingestion has now also started at the unit and context layer, with dedicated coverage for root `unstable_serialize`, Vue key-source serialization, and the SWR-style "mutate before mount still renders prefetched data and then revalidates" behavior.
- A dedicated `core-preload-context` domain file now covers shared preload and context-boundary behavior, including deduped preload reuse, failed-preload retry, function-key preload argument forwarding, `useSWRVConfig().preload`, nested fallback-map merging, and functional `SWRVConfig` values.
- The same `core-preload-context` domain file now also covers `useSWRVConfig()` default exposure, extended config merging, and stable accessor identity across rerenders.
- A dedicated `core-loading-key` domain file now covers upstream-inspired loading and key behavior as well, including shared validating state, key-switch race suppression, clearing stale data on key change without `keepPreviousData`, function-key failure handling, and deep-equal object-key deduplication.
- The same `core-loading-key` domain file now also covers validating-state reset when a shared request errors, so shared-key hooks are exercised on both success and failure paths.
- The same `core-loading-key` domain file now also covers manual revalidation preserving `isLoading: false` once data exists, plus `null` keys staying idle.
- A dedicated `core-keep-previous` domain file now covers SWR-style `keepPreviousData` behavior, including key changes, mixed shared-cache consumers, fallback interaction, same-key revalidation after `mutate(undefined)`, and reactive provider-config changes.
- A dedicated `core-broadcast-state` domain file now covers shared-key broadcast behavior for refreshed data, propagated errors, and mutate-driven `isValidating` state across multiple consumers.
- A dedicated `core-devtools` domain file now covers the built-in devtools hook, including global middleware injection and Vue-module exposure for devtools integrations.
- A dedicated `core-fetcher` domain file now covers falsy per-hook fetchers plus reactive provider-fetcher updates, so `null`, `undefined`, and `false` all stay idle without starting requests and shared fetchers can change over time through `SWRVConfig`.
- A dedicated `core-normalized-args` domain file now covers SWR-style normalized public hook arguments for `useSWRV`, `useSWRVImmutable`, and `useSWRVInfinite`, including config-only calls that rely on `config.fetcher`.
- A dedicated `core-ssr-hydration` domain file now covers snapshot serialization, client hydration from a request-scoped snapshot, and server rendering against hydrated client state through `@vue/server-renderer`.
- The same `core-ssr-hydration` domain file now also covers the internal server-environment helper, server-safe root `preload()` behavior, server-side hook non-fetching, immutable server behavior, and `strictServerPrefetchWarning` for missing SSR handoff data.
- A dedicated `core-ttl-lifecycle` domain file now covers the compatibility-oriented `ttl` extension and runtime cleanup behavior, including `ttl: 0` persistence, positive-ttl expiry for later consumers, in-flight request completion after loading-entry expiry, and listener or revalidator cleanup on unmount.
- A dedicated `core-cache-provider` domain file now covers provider-scoped cache behavior, including isolated clients, seeded cache reads, scoped cache mutation through `useSWRVConfig`, nested provider boundaries, and parent-cache extension through `provider(parentCache)`.
- The same `core-cache-provider` domain file now also covers default global helper exposure, fallback precedence inside custom providers, fallback hierarchy isolation across nested config boundaries, provider non-recreation on rerender, remount-safe cache reuse for stable providers, public `SWRVConfig.defaultValue` exposure, and custom `initFocus` and `initReconnect` hooks that own provider-scoped event listeners without replacing the inherited cache by default.
- A dedicated `core-web-preset` domain file now covers the default browser preset wiring for `SWRVConfig.defaultValue.initFocus` and `initReconnect`, including cleanup and no-op behavior when browser globals lack event APIs.
- A dedicated `core-utils` domain file now covers upstream-inspired `stableHash` and `mergeConfiguration` behavior.
- A dedicated `core-middleware` domain file now covers base and cross-API middleware behavior, including original-key forwarding, null fetchers, config-boundary `use` composition order, key rewriting, non-serialized key forwarding, and middleware passthrough for `infinite`, `mutation`, and `subscription`.
- A dedicated `core-subscription` domain file now covers subscription behavior end to end, including push updates, scope cleanup, fallback and error recovery, original-key forwarding, deduped subscriptions, key updates, singleton switching, stable-key no-resubscribe behavior, SWR/cache isolation, and disposer enforcement.
- A dedicated `core-mutation` domain file now covers `useSWRVMutation` end to end, including upstream-inspired trigger result semantics, hook-level and per-trigger callbacks, populateCache and optimistic shared-cache updates, non-deduped triggers, latest-closure usage, reset and race handling, missing-key and missing-fetcher errors, and falsey rejection behavior.
- A dedicated `core-local-mutate` domain file now covers bound, scoped, and global mutate behavior, including optimistic local updates, `rollbackOnError: false`, committed-snapshot `populateCache` transforms, function-style `revalidate`, filtered mutate behavior, internal-key filtering, shared local state without a fetcher, idle local-state flags without a fetcher, scoped mutate callback inputs, array keys containing `null`, null-key global mutate behavior, unmounted-key dedupe invalidation, in-flight request and mutation suppression, local mutation error isolation, successful local-mutate error clearing, latest-key bound mutate behavior, explicit and async `undefined` mutation payloads, disabled-revalidation mutate flags, and bound revalidation without clearing current data first.
- A dedicated `core-infinite` domain file now covers the main `useSWRVInfinite` surface, including cursor loading, preloaded pages, first-page revalidation policy, page-selective and optimistic bound mutations, `unstable_serialize` cache mutation paths, parallel mode, size persistence and callback updates, seeded cache reuse, fallback retention during growth, and page sharing with plain `useSWRV`.
- A dedicated `core-runtime-shared` domain file now covers shared base-hook runtime behavior, including concurrent-request dedupe, stable serialized-key watch behavior, and active-listener payload sync without cache rereads.
- A dedicated `core-activation-pause` domain file now covers base-hook activation and pause semantics, including `revalidateOnMount` behavior, key-change activation, mount-time fallback revalidation, paused initial state, paused mutate suppression, paused error discards, and idle fallback data when revalidation is disabled.
- The old catch-all `swrv.test.ts` monolith has now been retired; the parity suite is organized by domain files instead of a mixed API-level grab bag.
- A dedicated `core-refresh-compare` domain file now covers upstream-inspired interval polling and compare behavior, including deduped polling, reactive provider interval changes, function-style refresh intervals, stop-polling updates, and compare-only-on-data semantics.
- The same `core-refresh-compare` domain file now also covers fast key-switch polling behavior so stale refresh completions cannot shift the new key's timer lane or fire stale `onSuccess` callbacks.
- A dedicated `core-error-state` domain file now covers upstream-inspired error semantics, including synchronous and asynchronous fetcher failures, deduped `onError`, preserved error state during manual revalidation, `shouldRetryOnError` gating, and stale-key error callback suppression.
- Repository maintenance scaffolding now exists for CI, Renovate, and release publishing.
- Release publishing is now routed through `vp pm publish` in GitHub Actions so the workspace package manager remains responsible for `catalog:` dependency resolution and Trusted Publisher provenance.
- The remaining `2.0` scope has now been narrowed further:
  - Vue Suspense-compatible parity is in scope for `2.0`
  - a lightweight built-in debug or devtools middleware story is in scope for `2.0`
  - first-party Vue SSR and hydration helpers plus behavior tests are in scope for `2.0`, while Nuxt-specific adapters remain follow-up work
- The package publish surface is now materially closer to launch-ready:
  - config-level `fallback` data is supported and stays visible during initial revalidation
  - nested `SWRVConfig` boundaries merge fallback maps in SWR-style order
  - `SWRVConfig` now also supports the SWR-style functional `value` form, which receives the parent config but replaces parent overrides with its returned object
  - `SWRVConfig.provider` now also receives the parent cache, so nested providers can extend rather than only replace the inherited cache view
  - `SWRVConfig` now also exposes `defaultValue` and supports SWR-style `initFocus` and `initReconnect` config hooks, with custom event initializers owning provider-scoped revalidation listeners without replacing the inherited cache by default
  - SWR-style `use` middleware composition now works across `useSWRV`, `immutable`, `infinite`, `mutation`, and `subscription`
  - the published package includes explicit typed subpath exports, a package README, and an Apache-2.0 license file
  - root exports now also include `serializeSWRVSnapshot()` and `hydrateSWRVSnapshot()` for request-scoped SSR snapshot round-trips
  - root `preload()` is now a no-op on the server, and config `strictServerPrefetchWarning` can warn when server renders reach keys without fallback or hydrated snapshot data
  - root contributor and security guidance now exist for repository users and maintainers
  - the current release path has been revalidated after the latest parity hardening through package and publish dry-runs
  - the workspace and published package manifests are now aligned to the intended prerelease line at `2.0.0-next.0`
  - the docs site no longer carries a separate status page; the launch surface is documented inline through the main docs and `Migrate from v1`
  - the repo now contains a concrete stable-release checklist under `journey/logs/2026-03-19-stable-release-checklist.md`
  - the remaining non-suspense release work is now mostly outside the repo: Trusted Publisher production verification, stable release-note preparation, and the actual stable tag decision
- the pre-stable refinement lane is now complete for the current scope: the runtime types and middleware boundaries have been simplified, the remaining code-level naming rough edges have been cleaned up, and the docs site has now completed its from-scratch SWR-structured rebuild
- the docs site now uses default VitePress layout primitives, keeps the built-in code block treatment and highlighting, and themes the site through separate light and dark `--theme-*` token sets bridged through a shared VitePress `--vp-*` mapping layer plus the SWRV logo
- the docs site now uses Shiki's `night-owl-light` and `night-owl` themes for code blocks, so syntax highlighting follows a dual light/dark Night Owl pairing instead of the VitePress default
- the docs site now explicitly loads Roboto and Space Grotesk for the theme font tokens, so base copy and heading typography no longer rely on unresolved font-family names
- the docs site now renders install snippets through `vitepress-plugin-npm-commands`, with a local markdown extension that adds a `vp` tab beside the standard package-manager commands
- the rebuilt docs now use Vue-correct composable examples and treat `useSWRV` usage as `setup()` or `<script setup>`-only across the narrative docs
- the remaining non-suspense work has returned to stable-release execution rather than more in-repo feature or docs churn
- Internal simplification work has now started after parity closure:
  - web-preset defaults and event initializers now live in a dedicated `_internal/web-preset.ts` module instead of being mixed into `config.ts` and `client.ts`
  - provider-scoped runtime maps now live behind `_internal/provider-state.ts`, and cache read/write concerns now live behind `_internal/cache-helper.ts`
  - config responsibilities are now split across a thin public `config.ts` facade plus `config-context.ts` and `config-utils.ts`
  - shared internal key prefixes for `infinite` and `subscription` now live in `_internal/key-prefix.ts`
  - repeated WeakMap store initialization for the base hook, `infinite`, and `subscription` now lives behind a shared `_internal/scoped-storage.ts` helper
  - `infinite` and `subscription` side stores now live behind `_internal/infinite-state.ts` and `_internal/subscription-state.ts`
  - stable scoped helper identities for `mutate` and `preload` now live in provider state instead of separate module-level helper caches
  - `createSWRVClient()` is now a much thinner facade over provider-state, cache-helper, and event binding helpers
  - the public `useSWRV` entrypoint is now a thin overload plus middleware wrapper, and the heavy runtime logic now lives in `use-swrv-handler.ts`
  - middleware resolution and SSR missing-prefetch warnings are now isolated into `_internal/middleware-stack.ts` and `_internal/server-prefetch-warning.ts` instead of being owned directly by the public hook modules
  - three explicit post-refactor review rounds did not reveal further safe simplification work beyond the current shape; the remaining complexity is now mostly the unavoidable base-hook runtime itself
- The main reference materials for the rebuild remain:
  - `journey/research/swr-vs-swrv.md`
  - `journey/research/2026-03-18-swrv-next-vs-swr-and-swrv-current-state.md`
  - `journey/research/2026-03-19-fallback-data-typing-gap.md`
  - `journey/research/2026-03-19-swrv-next-complexity-and-simplification.md`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr` (local SWR source, version 2.4.1)
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs` (local SWR docs source tree for docs IA and content structure)
  - `/Users/yiling.gu@konghq.com/Developer/Kong/swrv` (local legacy SWRV source, version 1.1.0)

## Observed Gaps

- SWR is modular and export-oriented, with `infinite`, `mutation`, `subscription`, `immutable`, `/_internal`, provider-scoped runtime state, and broad behavior/type/e2e coverage.
- Legacy SWRV is centered on `useSWRV` and `mutate`, uses module-level singleton caches, exposes TTL/serverTTL directly, and has a much smaller runtime, test, and type surface.
- Legacy SWRV tooling and workflows are outdated: Yarn 1, Vue CLI, webpack 4, Jest, older TypeScript, and a minimal CI pipeline.

## Working Decisions

- Use SWR behavior, tests, and source organization as the default compatibility target. Treat the old SWRV codebase mainly as migration context and a source of Vue-specific lessons, not as the authoritative design.
- Rebuild the runtime around cache/provider-scoped state instead of module singletons so cache isolation, deduplication, listeners, and SSR request boundaries are explicit.
- Keep the public API as close to SWR as practical, but preserve a Vue-native reactive contract for returned state and composition.
- Treat types, automated tests, docs, CI/CD, release automation, and dependency maintenance as first-class project scope, not cleanup work after the runtime is complete.
- Keep project memory current in `journey/design.md`, use `journey/plans/` for milestone or phase plans, and use `journey/logs/` for implementation notes and dead ends.
- Use plain VitePress scripts for docs builds inside `packages/site`, but continue to drive workspace orchestration through `vp run ...`.
- Keep the library build on stable declaration generation for now instead of the experimental `tsgo` path.
- Expand the `2.0` SSR scope beyond the first launch-ready cut to include first-party Vue SSR and hydration helpers, server-safe preload and fallback behavior, and dedicated SSR behavior tests. Nuxt-specific adapters or framework modules remain follow-up work, not `2.0` blockers.
- Do not port SWR's getter-based dependency-collection mechanism into Vue. `swrv-next` already exposes separate refs, so Vue's native dependency tracking is the right model. Performance follow-up should focus on narrower issues such as redundant cache-to-ref sync and unstable watch sources instead.
- Include a Vue Suspense-compatible parity lane in `2.0`, covering applicable SWR suspense behavior and type semantics, while excluding React-specific rendering mechanics.
- Vue Suspense feasibility is now narrower than the original goal: mount-time suspension is technically viable through Vue internals, but later key-change re-suspension does not follow the same path. Final `2.0` suspense scope needs an explicit product decision between limited initial-mount support and a riskier deeper-internals approach.
- Include a lightweight built-in debug or devtools middleware story in `2.0` that provides first-party inspection hooks and middleware-preset parity. A dedicated browser extension or deep Vue Devtools integration is follow-up work.
- Freeze the rebuilt release line as a breaking `2.x` track, and keep prerelease automation on the `next` dist-tag until the first stable cut is ready.
- Freeze the published Vue support range at `>=3.2.26 <4`.
- Freeze the typed-consumer and contributor TypeScript baseline at `>=5.5`.
- Keep `ttl` as a supported compatibility-oriented extension in the current cut, but do not restore `serverTTL` as part of the rebuilt core API.
- Use sentence case throughout docs, site chrome, and non-code copy unless a proper noun or code literal requires otherwise.
- Treat the docs tree, navigation, and page depth from the upstream SWR docs source as the active baseline for future documentation work. New docs changes should preserve that structure instead of drifting back toward one-off page naming or ad hoc navigation.

## Planned Repository Shape

- `packages/swrv`: published library package
- `packages/site`: VitePress docs site
- `journey/`: project memory and planning artifacts

## Follow-up Questions

- Whether `2.0` should ship limited initial-mount `suspense: true` support, or defer fuller SWR suspense parity because later key-change fallback behavior is not cleanly achievable with Vue's current mechanics
- Whether any remaining advanced edge semantics in `infinite`, `mutation`, and `subscription` are worth tightening further before or after the first stable `2.0` release
- How much additional type-level precision is worth adding beyond the current public overloads once the API surface is exercised by real consumers
- Whether any future simplification effort should go beyond the current helper-backed client boundary, given that the remaining complexity is now concentrated in the core hook runtime rather than in removable cross-module abstractions
