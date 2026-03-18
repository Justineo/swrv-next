# SWRV Next Design Snapshot

Status: Launch-ready current cut
Last updated: 2026-03-18

## Mission

Rebuild SWRV as a modern, well-maintained, Vue-native counterpart to SWR. The new project should treat SWR 2.4.1 as the primary behavioral and API reference, while expressing the result as idiomatic Vue composables and SSR-safe runtime primitives instead of a literal React port.

## Current State

- The repository now uses the intended monorepo shape:
  - `packages/swrv`
  - `packages/docs`
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
  - error retries now survive refresh scheduling instead of being cleared immediately
  - the immutable entry point now disables polling by forcing `refreshInterval: 0`
  - `isPaused()` now gates mount, focus, reconnect, polling, and mutate-driven revalidation, and in-flight results are discarded while paused
  - bound `mutate()` now correctly treats a no-argument call as revalidation instead of mutating the cache to `undefined`
  - config-level `onSuccess` and `onError` callbacks now exist for base requests
  - config-level `isVisible()` and `isOnline()` overrides now participate in focus, reconnect, and active-state gating
  - config-level `onErrorRetry`, `onLoadingSlow`, and `onDiscarded` now exist for retry scheduling, slow-request signaling, and stale-response races
  - the request path now holds onto the exact in-flight promise instead of re-reading it through the dedupe window, which fixes `dedupingInterval: 0` flakiness
  - request and mutation ordering now use high-resolution timestamps, which avoids false stale-response discards when revalidation starts immediately after a mutation
  - base and global mutate coverage now explicitly includes `rollbackOnError: false`, committed-snapshot `populateCache` transforms, function-style `revalidate`, and filter-based function revalidation
  - filter-based global `mutate()` now skips the internal `$inf$` and `$sub$` cache records so implementation details do not leak through the public key-filter path
  - preload requests now dedupe by serialized key, clear failed entries for retries, accept function and tuple keys with typed fetcher arguments, and are consumed by the first matching hook fetch
  - cache-listener updates now consume the listener payload directly instead of re-reading cache for the active hook, and local cache writes no longer redundantly re-apply state when the active subscription already covers the key
  - cache write notifications are now normalized through the adapter's read path before listeners fire, so custom provider caches that transform `get()` results stay consistent for active hooks as well as later reads
  - key watchers for `useSWRV` and `useSWRVSubscription` now track stable serialized keys instead of fresh tuple objects, which avoids unnecessary reactivation, refetch, and resubscription work when reactive dependencies invalidate without changing the effective key
  - polling timers now reschedule when provider-driven refresh settings change, including reactive `refreshInterval` updates and function-style intervals that derive their next delay from the latest data
  - stale per-hook refresh completions no longer reset polling or fire hook-local success or error callbacks after the hook has switched to a different key, while cache updates for the old key still land for other consumers
  - synchronous fetcher throws are now normalized into rejected promises at the fetcher boundary, so `error`, retry, and callback semantics match asynchronous failures instead of leaking unhandled watcher errors
- The infinite and mutation helpers have also moved closer to SWR:
  - `swrv/infinite` now exposes `unstable_serialize`, resolves page keys safely, supports cursor-style sequential loading, and treats `setSize()` as a page-oriented operation instead of a raw aggregate refresh
  - `swrv/infinite` now revalidates the first page while loading new pages and lets no-arg `mutate()` revalidate all loaded pages
  - `swrv/infinite` now respects `revalidateFirstPage: false` while growing, uses cached data first in `setSize()`, and supports page-selective revalidation callbacks through bound `mutate(data, { revalidate })`
  - `swrv/infinite` now consumes preloaded page requests, including multiple preloaded pages in parallel mode
  - `swrv/infinite` now revalidates page entries when the aggregate infinite cache and per-page cache diverge after local mutation, which keeps later size growth aligned with SWR's aggregate/page cache model
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
  - public compile-time coverage exists for root and subpath APIs
  - bound and scoped mutators now expose the mutation-result type instead of collapsing everything to cached-data type, and mutator callbacks can now model different output payloads from their input snapshot
  - `useSWRVInfinite` bound mutators now also accept mutation payload types distinct from the aggregate page-array shape, which keeps `populateCache` and optimistic transform flows type-safe for both single-page and multi-page cases
  - `useSWRVMutation` now models SWR-style trigger overloads more closely, including no-arg and optional-arg triggers, hook-level `throwOnError` defaults, and separate cache-data typing for `optimisticData` and `populateCache`
  - mutation type coverage now also explicitly checks no-arg trigger typing and ensures mutation responses do not leak base-hook fields like `mutate`
  - `useSWRVSubscription` handler keys now narrow to the resolved non-nullish key type even when the key source itself is conditional
  - the package export map now points at the emitted `.d.mts` declaration files and is checked by a package-export smoke test
- The docs package now builds with VitePress and includes a first guide, API overview, and migration page.
- The docs package now also includes examples, a current-scope page, and an explicit SSR guide built around provider-scoped clients plus config-level fallback data.
- The docs package now targets the VitePress 2 prerelease line (`2.0.0-alpha.16`) instead of the VitePress 1 stable line so the docs stack stays on the intended forward-looking baseline.
- Under the VitePress 2 plus Rolldown path used here, the docs package now also carries `oxc-minify` explicitly because VitePress requires it for production builds on that toolchain.
- Browser-facing end-to-end coverage now exists through a Playwright fixture app under `packages/swrv/e2e`, covering focus revalidation, reconnect revalidation, optimistic mutation UI, and subscription pushes in a real browser runtime.
- The test suite has now started splitting into domain files instead of a single monolith, with the first extracted `core-config-revalidate` coverage file carrying config fallback, focus, reconnect, retry, callback, and immutable revalidation behavior plus an upstream-inspired reactive `SWRVConfig` focus test.
- Upstream parity ingestion has now also started at the unit and context layer, with dedicated coverage for root `unstable_serialize`, Vue key-source serialization, and the SWR-style "mutate before mount still renders prefetched data and then revalidates" behavior.
- A dedicated `core-loading-key` domain file now covers upstream-inspired loading and key behavior as well, including shared validating state, key-switch race suppression, clearing stale data on key change without `keepPreviousData`, function-key failure handling, and deep-equal object-key deduplication.
- A dedicated `core-cache-provider` domain file now covers provider-scoped cache behavior, including isolated clients, seeded cache reads, scoped cache mutation through `useSWRVConfig`, nested provider boundaries, and parent-cache extension through `provider(parentCache)`.
- A dedicated `core-middleware` domain file now covers base and cross-API middleware behavior, including original-key forwarding, null fetchers, config-boundary `use` composition order, key rewriting, non-serialized key forwarding, and middleware passthrough for `infinite`, `mutation`, and `subscription`.
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
  - SWR-style `use` middleware composition now works across `useSWRV`, `immutable`, `infinite`, `mutation`, and `subscription`
  - the published package includes explicit typed subpath exports, a package README, and an Apache-2.0 license file
  - root contributor and security guidance now exist for repository users and maintainers
  - the current release path has been revalidated after the latest parity hardening through package and publish dry-runs
  - the workspace and published package manifests are now aligned to the intended prerelease line at `2.0.0-next.0`
- The main reference materials for the rebuild remain:
  - `journey/research/swr-vs-swrv.md`
  - `journey/research/2026-03-18-swrv-next-vs-swr-and-swrv-current-state.md`
  - `/Users/yiling.gu@konghq.com/Developer/Justineo/swr` (local SWR source, version 2.4.1)
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
- Use plain VitePress scripts for docs builds inside `packages/docs`, but continue to drive workspace orchestration through `vp run ...`.
- Keep the library build on stable declaration generation for now instead of the experimental `tsgo` path.
- Expand the `2.0` SSR scope beyond the first launch-ready cut to include first-party Vue SSR and hydration helpers, server-safe preload and fallback behavior, and dedicated SSR behavior tests. Nuxt-specific adapters or framework modules remain follow-up work, not `2.0` blockers.
- Do not port SWR's getter-based dependency-collection mechanism into Vue. `swrv-next` already exposes separate refs, so Vue's native dependency tracking is the right model. Performance follow-up should focus on narrower issues such as redundant cache-to-ref sync and unstable watch sources instead.
- Include a Vue Suspense-compatible parity lane in `2.0`, covering applicable SWR suspense behavior and type semantics, while excluding React-specific rendering mechanics.
- Include a lightweight built-in debug or devtools middleware story in `2.0` that provides first-party inspection hooks and middleware-preset parity. A dedicated browser extension or deep Vue Devtools integration is follow-up work.
- Freeze the rebuilt release line as a breaking `2.x` track, and keep prerelease automation on the `next` dist-tag until the first stable cut is ready.
- Freeze the published Vue support range at `>=3.2.26 <4`.
- Freeze the typed-consumer and contributor TypeScript baseline at `>=5.5`.
- Keep `ttl` as a supported compatibility-oriented extension in the current cut, but do not restore `serverTTL` as part of the rebuilt core API.

## Planned Repository Shape

- `packages/swrv`: published library package
- `packages/docs`: VitePress docs site
- `journey/`: project memory and planning artifacts

## Follow-up Questions

- Whether any remaining advanced edge semantics in `infinite`, `mutation`, and `subscription` are worth tightening further before or after the first stable `2.0` release
- How much additional type-level precision is worth adding beyond the current public overloads once the API surface is exercised by real consumers
