# Merge Renovate PRs Except TypeScript 7

## Goal

Merge open Renovate PRs #23, #27, and #33 while leaving #28 (TypeScript 7) open.

## Plan

1. Confirm each target PR's current merge state, checks, and repository merge convention.
2. Merge the already-green GitHub Actions updates (#23 and #27).
3. Rebase PR #33 on the updated `main`, diagnose its install/build failures, and make the smallest dependency-alignment fix on its branch.
4. Run the repository-required Vite+ validation (`vp install`, `vp check`, and `vp test`) plus any failure-specific build verification.
5. Push the repaired PR branch, wait for GitHub CI and Vercel, and merge only after all required checks pass.
6. Record the outcome and verify that #28 remains open.

## Constraints

- Preserve the user's existing `AGENTS.md` modification.
- Do not merge or modify PR #28.
- Keep Vite+ package aliases internally compatible rather than bypassing install or CI checks.
