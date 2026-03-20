# CI setup-vp alignment

Completed the CI correction using the official Vite+ guidance from https://viteplus.dev/guide/ci.

Changes:

- Replaced manual `actions/setup-node` plus global `npm install --global vite-plus pnpm` with `voidzero-dev/setup-vp@v1` and `cache: true`.
- Restored plain `vp` commands for install, check, test, Playwright, build, and the package dry-run.
- Moved the package dry-run to `packages/swrv` and now use `vp pm pack -- --json --dry-run` instead of direct `pnpm`.
- Removed the root `jsdom` devDependency that had only been added to support the earlier CI workaround.
- Kept the lockfile change minimal by removing only the root importer entry for `jsdom`.
- Opted GitHub JavaScript actions into Node 24 with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` so the workflow stays warning-free while `setup-vp` still ships with `runs.using: node20`.

Validation:

- `vp install --frozen-lockfile`
- `vp check`
- `vp run test -r`
- `vp exec playwright test`
- `vp run build -r`
- `vp pm pack -- --json --dry-run` in `packages/swrv`
