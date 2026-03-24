# V1 migration guide

Date: 2026-03-24
Status: complete

## Goal

Turn the current high-level `Migrate from v1` page into a practical migration guide for users on
the published `swrv` v1 line, and improve docs presentation so migration content is easy to find
from the docs nav and from the main API/getting-started entry points.

## Baseline

- Current published `swrv` version: `1.2.0`
- Current repo package version: `2.0.0-next.0`
- Existing migration page is too brief for a real upgrade flow
- Existing sidebar placement makes migration easy to miss because it sits near the end of the guide
- The important migration deltas are not just new APIs, but changed semantics:
  - provider-scoped config and cache boundaries via `SWRVConfig`
  - dedicated `preload`, `useSWRVInfinite`, `useSWRVMutation`, and `useSWRVSubscription`
  - explicit SSR fallback / snapshot hydration
  - removal of `ttl`, `serverTTL`, `revalidateDebounce`, `SWRVCache`, and built-in cache adapter paths
  - changed global and bound `mutate` behavior

## Plan

1. Rewrite `packages/site/docs/migrate-from-v1.md` around a concrete upgrade path instead of a
   short concept overview.
2. Include an API comparison matrix with:
   - unchanged / mostly-compatible surface
   - removed APIs and options
   - replacements and no-direct-replacement cases
3. Add step-by-step migration sections with before/after code for:
   - installation and rollout framing
   - shared config via `SWRVConfig`
   - reads
   - prefetch and mutation
   - pagination and live data
   - cache / TTL / persistence
   - SSR and hydration
   - tests
4. Improve docs presentation:
   - move migration higher in the sidebar
   - shorten top-nav wording to `Migration`
   - add direct migration links from `Getting started` and `API`
5. Keep the main migration path compatibility-first:
   - dependency switch first
   - only required fixes in the main path
   - optional SWRV 2 feature adoption moved to follow-up work
6. Validate docs formatting and build/check status for the affected package/workspace.

## Notes

- The migration guide should target users coming from `swrv@1`, not SWR users.
- The guide should be explicit when behavior changed and avoid claiming drop-in compatibility where
  semantics actually differ.
