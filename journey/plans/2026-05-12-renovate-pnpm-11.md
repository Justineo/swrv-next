# Renovate pnpm 11 PR Fix Plan

## Goal

Get Renovate PR #12 (`chore(deps): update pnpm to v11`) into a mergeable state, merge it, then return the local checkout to the latest `main`.

## Current State

- PR #12 is open from `renovate/pnpm-11.x` to `main`.
- Renovate rebased the branch after the non-major dependency PR merged.
- GitHub Actions `validate` and Vercel are failing.
- The PR is a major pnpm update and is intentionally manual-review-only.

## Plan

1. Inspect failing GitHub Actions logs and classify any external Vercel failure separately.
2. Check out `renovate/pnpm-11.x` and run the Vite+ install/check/test path locally.
3. Apply the smallest pnpm 11 migration fix needed for the observed failure.
4. Run local validation with `vp install`, `vp check`, and `vp test`.
5. Push the fix to the PR branch, wait for required remote checks, and merge when green.
6. Switch back to `main`, fast-forward pull, and confirm the worktree is clean.

## Notes

- Use Vite+ commands only for package-manager and validation operations.
- Do not merge while required checks are failing.
