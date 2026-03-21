# Helper alignment with SWR

Date: 2026-03-22
Status: completed

## Goal

Replace the temporary one-off `promise-like.ts` extraction with a helper layout
that better matches upstream SWR's internal utility organization.

## Scope

- introduce a small `_internal/shared.ts` only for genuinely cross-cutting helpers
- move the current promise-like guard into that shared module
- colocate other duplicated tiny helpers there only when they are already shared
- avoid broader churn that would reorganize unrelated runtime modules

## Plan

### T1. Introduce a shared internal helper module

- mirror SWR's helper intent without copying unused upstream utilities
- keep the module limited to helpers with real multi-module use

Status: completed

### T2. Repoint current callsites

- replace `promise-like.ts` imports
- reuse the shared `noop` and `isFunction` helpers where that reduces local duplication

Status: completed

### T3. Validate and record

- run `vp check`
- run `vp test`
- update `journey/design.md` and the task log if the effective snapshot changed

Status: completed
