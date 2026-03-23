# Analysis Follow-up Cleanups Log

Date: 2026-03-22

- Updated `packages/swrv/package.json` so the package-local `check` script scopes validation to source inputs instead of implicitly scanning generated `dist/` output.
- Consolidated internal cache-key prefix knowledge into `packages/swrv/src/_internal/key-prefix.ts` and removed the now-redundant `_internal/constants.ts`.
- Updated infinite and subscription key builders to use the shared internal cache-key helper.
- Added maintainer-facing comments clarifying which `SWRVConfig` inputs define a boundary once and which request-time options stay reactive after mount.
- Validation summary:
  - `vp run swrv#check` passed
  - `vp run swrv#test` passed (`24` files, `221` tests)
  - `vp exec playwright test` passed (`4` tests)
