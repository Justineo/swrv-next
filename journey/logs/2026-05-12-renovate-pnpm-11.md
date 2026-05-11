# Renovate pnpm 11 PR Log

## 2026-05-12

- Confirmed PR #12 is `renovate/pnpm-11.x` and updates the root package manager from `pnpm@10.33.3` to `pnpm@11.0.5`.
- Inspected the failing GitHub Actions `validate` job. The failure happens during `vp install` under pnpm 11 before project validation starts.
- Root cause: pnpm 11 treats ignored build scripts as an install error under its stricter build policy. The unresolved build scripts are for `esbuild@0.27.4` and `esbuild@0.28.0`.
- Applied the focused migration fix by adding `allowBuilds.esbuild: true` to `pnpm-workspace.yaml`, which keeps the build-script trust decision explicit in versioned workspace config.
- Local validation passed for `vp install`, `vp check`, `vp test`, `vp install --frozen-lockfile`, and `vp pm pack -- --json --dry-run` in `packages/swrv`.
- A first local `vp exec playwright test` attempt timed out waiting for the e2e dev server because the local install had skipped esbuild postinstall before the config fix. Rebuilding esbuild made the dev server respond locally; final merge confidence should come from the fresh remote CI run after pushing the fix.
