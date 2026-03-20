# Release verification robustness pass

Date: 2026-03-20

## Summary

Hardened the release-verification lane after the initial production-hardening
pass so the tarball smoke path is more deterministic, easier to debug, and less
likely to leak temp directories on interruption.

## Completed work

- Switched tarball resolution in `packages/swrv/scripts/release-smoke.mjs` from
  directory scanning to parsing `vp pm pack -- --json`.
- Added explicit temp-directory tracking and best-effort cleanup for both the
  packed artifacts directory and the temp consumer project.
- Added signal-driven cleanup handling for `SIGINT`, `SIGTERM`, and `SIGHUP`.
- Changed temp retention to opt-in debugging behavior through
  `SWRV_KEEP_SMOKE_TMP=1` instead of retaining temp directories on every
  failure by default.
- Updated `RELEASING.md` to document the debug-retention switch and corrected
  the stale release-note input reference.

## Validation

Passed:

- `vp run swrv#check -- --fix`
- `vp run swrv#release:verify`
- `vp test packages/swrv/tests/package-exports.test.ts`
- `vp run swrv#build`
