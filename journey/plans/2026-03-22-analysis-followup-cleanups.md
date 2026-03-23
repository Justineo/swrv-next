# Analysis Follow-up Cleanups

Date: 2026-03-22

## Goal

Implement the highest-value follow-up changes from the repository analysis:

- make the package-local validation path resilient to local generated `dist/`
  output
- reduce hidden internal cache-key coupling
- clarify subtle `SWRVConfig` boundary semantics for maintainers

## Planned changes

1. Update `packages/swrv/package.json` so `vp run swrv#check` validates the
   package source tree explicitly instead of implicitly scanning generated
   output.
2. Replace scattered internal key-prefix knowledge with a shared internal
   cache-key helper used by:
   - `packages/swrv/src/infinite/serialize.ts`
   - `packages/swrv/src/subscription/index.ts`
   - `packages/swrv/src/_internal/mutate.ts`
3. Add maintainer-facing clarification around `SWRVConfig` semantics in:
   - `packages/swrv/src/config-context.ts`
   - `packages/swrv/src/config-utils.ts`
4. Run targeted validation for the package and record the outcome.
