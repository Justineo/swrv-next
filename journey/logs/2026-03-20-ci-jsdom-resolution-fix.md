# CI jsdom resolution fix

- Investigated failed GitHub Actions run `23335013190` with `gh`.
- Confirmed the failure is in `vp run test -r`, not lint, build, or Playwright.
- Root cause: the Vite+ test runtime imports `jsdom` from a root/global context in CI, but `jsdom` was only declared in `packages/swrv`.
- Fix path: add `jsdom` to the root workspace, reinstall, and rerun the CI-equivalent validation steps.
- Added `jsdom` to the root workspace `devDependencies` and refreshed the lockfile with `vp install`.
- Revalidated with:
  - `vp check`
  - `vp run test -r`
  - `vp exec playwright test`
  - `vp run build -r`
  - `vp pm pack -- --json --dry-run` in `packages/swrv`
- Result: the previously failing workspace test lane now passes locally with the same command used by CI.
