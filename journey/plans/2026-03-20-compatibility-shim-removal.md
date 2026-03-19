# Compatibility shim removal

Date: 2026-03-20
Status: completed

## Goal

Remove pre-release compatibility-only modules, interfaces, and exports left behind by the SWR
alignment refactor, now that current branch structure is not a compatibility constraint.

## Scope

### In scope

- top-level forwarding files that only point at the real `src/index/` base-hook modules
- extra forwarding layers such as `src/index/index.ts` that do not carry independent meaning
- transitional helper types exported only to make the refactor compile
- `_internal` barrel exports that are only wiring helpers and not intended as stable internal API

### Out of scope

- intentional public package entrypoints and subpath exports
- feature-local runtime modules that now own real behavior
- Vue-specific runtime differences from SWR

## Planned work

1. Remove the top-level `use-swrv.ts` and `use-swrv-handler.ts` forwarding files.
2. Remove `src/index/index.ts` and import directly from `src/index/use-swrv.ts`.
3. Point feature modules at the final `src/index/use-swrv.ts` entry instead of the top-level shim.
4. Remove `SWRVHookWithArgs` from shared types and keep the helper-specific signature local.
5. Trim `_internal/index.ts` so it exports only the final intended `_internal` surface.
6. Revalidate tests, build, package output, and workspace build.

## Outcome

Completed as planned. The compatibility-only top-level forwarding files and shim type export are
removed, and the remaining `src/index/` split is kept because it still owns real runtime
responsibilities rather than compatibility concerns.
