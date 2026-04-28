# Renovate Vercel lockfile fix

- Reproduced the failing Renovate branch locally: the branch updated `pnpm-workspace.yaml` catalog entries and `packageManager`, but left `pnpm-lock.yaml` unchanged, so frozen installs failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`.
- Confirmed the deeper root cause from Renovate bot output and local reproduction: pnpm 10.32.x throws `Invalid Version` inside the targeted dependency update path (`installSome`) when workspace `catalog:` entries use ranged specifiers like `^1.58.2`.
- Applied the repository-side fix by pinning catalog entries in `pnpm-workspace.yaml` to exact versions and updating only the matching `catalogs.default.*.specifier` values at the top of `pnpm-lock.yaml`. No package graph refresh was kept.
- Validated the fix in three ways:
  - `vp install --frozen-lockfile` now passes in the main workspace.
  - `vp check` and `vp test` still pass.
  - A temporary worktree using the patched `pnpm-workspace.yaml` and `pnpm-lock.yaml` can now run `vp add -D @playwright/test@1.59.1 -w`, the same targeted update path that previously crashed with `Invalid Version`.
