# Reflected cleanup pass

Date: 2026-03-22
Status: completed

## Goal

Implement the remaining high-value cleanup items identified by the repository
analysis reflection, while avoiding churn that would move the codebase away
from SWR without a concrete benefit.

## Scope

- fix docs-site repository and asset drift
- remove the unused internal `"error-revalidate"` event concept
- deduplicate small internal helper logic
- document the subtle but intentional `SWRVConfig` boundary semantics
- update project memory when the effective project snapshot changes

## Plan

### T1. Fix docs-site ownership drift

- align docs GitHub links with the canonical repo
- replace the remote logo URL with local docs assets

Status: completed

### T2. Simplify dead internal runtime surface

- remove the unused `"error-revalidate"` internal event concept
- keep internal event typing aligned with the actual runtime paths

Status: completed

### T3. Deduplicate tiny helper logic

- consolidate repeated promise-like detection in internal helpers
- keep behavior identical

Status: completed

### T4. Clarify provider boundary semantics

- document what parts of `SWRVConfig` are reactive after mount
- document what only affects boundary creation or event binding

Status: completed

### T5. Validate and record

- run `vp check`
- run `vp test`
- update `journey/design.md` and the task log if the project snapshot changed

Status: completed
