# CI setup-vp alignment

Completed the CI correction using the official Vite+ guidance from https://viteplus.dev/guide/ci.

Changes:

- Replaced manual `actions/setup-node` plus global `npm install --global vite-plus pnpm` with `voidzero-dev/setup-vp@v1` and `cache: true`.
- Restored plain `vp` commands for install, check, test, Playwright, build, and the package dry-run.
- Moved the package dry-run to `packages/swrv` and now use `vp pm pack -- --json --dry-run` instead of direct `pnpm`.
- Removed the root `jsdom` devDependency that had only been added to support the earlier CI workaround.
- Kept the lockfile change minimal by removing only the root importer entry for `jsdom`.
- Tried both job-level and workflow-level `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`, but GitHub still reports the same deprecation annotation for `setup-vp@v1`. The warning appears to be controlled by the published action metadata rather than anything we can override safely in this workflow.

Validation:

- `vp install --frozen-lockfile`
- `vp check`
- `vp run test -r`
- `vp exec playwright test`
- `vp run build -r`
- `vp pm pack -- --json --dry-run` in `packages/swrv`
