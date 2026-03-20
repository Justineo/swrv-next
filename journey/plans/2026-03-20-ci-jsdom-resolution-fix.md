# CI jsdom resolution fix

## Goal

Restore the failing GitHub Actions test job by fixing the `jsdom` resolution path used by the workspace-wide Vite+ test runner.

## Findings

- The failed run is `23335013190` on `Justineo/swrv-next`.
- The `validate` job fails in the `Test` step while running `vp run test -r`.
- The repeated runtime error is `Cannot find package 'jsdom'` from the Vite+ test runner.
- `packages/swrv` already declares `jsdom`, but the workspace root does not.
- In CI, the Vite+ runner resolves `jsdom` from a root/global execution context, so package-local declaration is insufficient.

## Tasks

1. Done: add `jsdom` to the root workspace `devDependencies`.
2. Done: reinstall dependencies so the lockfile and root graph are consistent.
3. Done: run the same validation lanes used by CI.
4. Done: record the cause and fix in journey memory.
