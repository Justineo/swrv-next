# Renovate Vercel lockfile fix

1. Inspect the failing Renovate branch and commit to identify which catalog or package manager metadata change caused Vercel's frozen pnpm install to reject the lockfile.
2. Determine whether the fix belongs in Renovate configuration, workspace package metadata, or Vercel build setup.
3. Implement the smallest correct repository-side fix so Renovate PRs keep `pnpm-lock.yaml` aligned with catalog changes.
4. Validate the fix locally with frozen install semantics and Renovate config validation.
5. Record the effective understanding in `journey/design.md`, then commit and push to `main`.
