# Migration guide first-principles refinement

Date: 2026-03-24
Status: in progress

## Goal

Refactor `packages/site/docs/migrate-from-v1.md` so it reads like a simple decision flow for a v1
user instead of a numbered list of migration subpaths.

## Direction

- minimize the number of distinct migration buckets
- maximize explanation of why each breaking signature changed
- explain the underlying semantics of:
  - prefetch
  - revalidation
  - cache writes
- keep the flow simple for a reader who wants to preserve existing app behavior first

## Plan

1. Rewrite the guide around three reader questions:
   - do you use `mutate`?
   - do you rely on removed cache/config APIs?
   - does the app render on the server?
2. Replace `migration path 1/2/3/4` wording with intent-based mapping and before/after examples.
3. Explicitly explain how different function signatures map to different semantics in SWRV 2.
4. Validate docs formatting and build output.
