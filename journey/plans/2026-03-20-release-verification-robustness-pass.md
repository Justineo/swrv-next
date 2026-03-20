# Release verification robustness pass

Date: 2026-03-20
Status: completed

## Goal

Take the newly added release-verification lane from "working" to "robust and low-maintenance" by improving cleanup behavior, tarball handling, interruption safety, and documentation accuracy.

## Why this pass exists

The current release smoke check already proves real consumer install and import behavior, but it still has three quality gaps:

1. temporary directories are only cleaned on success and can be left behind on interruption
2. tarball discovery is based on directory scanning instead of parsing the pack result directly
3. repo docs still contain at least one stale release-memory reference and do not explain the temp-dir retention or cleanup policy clearly

These are not feature gaps, but they are the kind of operational rough edges that should be removed before stable release execution.

## Tasks

### T1. Harden temp-dir lifecycle

- add explicit cleanup management for artifacts and consumer temp directories
- clean up on success and on signal-driven interruption when possible
- preserve temp dirs only when explicitly requested for debugging

### T2. Make tarball resolution deterministic

- run pack in JSON mode
- parse the emitted tarball path from the command output instead of relying on directory shape assumptions
- keep the current behavior resilient to extra temp files in the artifacts directory

### T3. Tighten release-smoke ergonomics

- simplify command execution and quoting where possible
- make failure output clearer
- document any supported debug environment variables

### T4. Fix release docs drift

- remove stale release-note input references
- document the cleanup and debug behavior of the release-smoke flow
- update design and logs to reflect the hardened behavior

## Validation

- `vp run swrv#check -- --fix`
- `vp run swrv#release:verify`
- `vp test packages/swrv/tests/package-exports.test.ts`
- `vp run swrv#build`

## Completion rule

Do not stop after the script changes alone. Finish the script, docs, validation, and journey updates in one pass.

## Completion notes

- T1 completed: temp directories now clean up on success, failure, and handled
  interruption unless `SWRV_KEEP_SMOKE_TMP=1` is set.
- T2 completed: tarball resolution now parses `vp pm pack -- --json` instead of
  scanning the artifacts directory.
- T3 completed: failure messaging now points to the debug env var, and
  release-smoke command execution is more deterministic.
- T4 completed: release docs and journey memory now describe the actual debug
  and cleanup behavior and no longer reference the stale hardening log name.
