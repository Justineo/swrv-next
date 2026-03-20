# Final production hardening log

Date: 2026-03-20

## Summary

Completed the final repo-side production-hardening pass after reviewing the full `journey/`
history, the latest SWR-alignment state, and the remaining release-readiness gaps.

## Completed work

- Reconciled current journey memory around deferred Suspense, release-readiness, and historical
  docs-status references.
- Tightened the remaining source typing where practical and documented the two remaining localized
  framework-facing boundaries:
  - `SWRVConfig` Vue prop typing
  - `_internal/with-middleware.ts`
- Disabled `pack.exports` auto-rewrites and restored explicit runtime plus type targets for every
  public package export path.
- Added `packages/swrv/scripts/release-smoke.mjs` plus committed consumer templates for tarball
  smoke validation.
- Added package-local and root `release:verify` commands.
- Added first-class repo release guidance in `RELEASING.md`.
- Updated root and package README guidance to use Vue-correct `setup()` or `<script setup>`
  semantics and the current install or release-verification policy.
- Removed duplicate or superseded 2026-03-20 plan and log files so the current journey story uses
  one assessment, one plan, and one completion log for this hardening lane.

## Validation

Passed:

- `vp run swrv#check -- --fix`
- `vp test packages/swrv/tests`
- `vp run swrv#build`
- `vp exec playwright test`
- `vp run build -r`
- `vp run swrv#release:verify`

Blocked in the current worktree only by untouched user edits:

- `vp check`
- `vp run release:verify`

Current blocker detail:

- `packages/site/docs/.vitepress/theme/index.css` still has formatting changes that this pass did
  not modify by request.

## Outcome

The repo-owned production-hardening lane is complete. Remaining release blockers are now external
maintainer checks, stable release timing, and the intentionally deferred Suspense scope.
