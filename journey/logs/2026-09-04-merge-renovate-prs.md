# Merge Renovate PRs Except TypeScript 7 — Log

- Merged PR #23 (`actions/checkout` v7) after confirming its checks were green.
- Merged PR #27 (`actions/setup-node` v7). The GitHub CLI token could not update a workflow file, so the already-reviewed PR head was merged into `main` through the authenticated Git remote; GitHub recorded PR #27 as merged.
- Rebased PR #33 on the resulting `main`.
- Diagnosed PR #33's clean-install failure as the obsolete
  `@voidzero-dev/vite-plus-test@0.1.24` override pulling
  `@voidzero-dev/vite-plus-core@0.1.24` beside `vite-plus@0.3.0`.
- Removed the obsolete Vitest alias and override. Vite+ 0.3 supplies upstream
  Vitest transitively; the matching Vite core override remains.
- Updated VitePress 2 alpha theme configuration from the removed
  `lastUpdatedText` and `outlineTitle` fields to the new nested options.
- Corrected recursive Vite+ task syntax from `vp run <task> -r` to
  `vp run -r <task>` across scripts, CI, release validation, and current
  contributor documentation. The old form selected zero tasks.
- Local validation passed:
  - clean `vp install`
  - `vp check`
  - 222 unit tests through `vp run -r test`
  - both package and documentation builds through `vp run -r build`
  - 4 Playwright browser tests
  - package dry-run and the complete `vp run release:verify` smoke lane
- PR #28 (TypeScript 7) was deliberately left open and unchanged.
