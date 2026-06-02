# PR 17 Vercel Build Fix Log

## 2026-06-02

- Started from Vercel build logs for PR 17. The failure happens before docs
  rendering, while loading `.vitepress/config.ts` through Vite+ / Rolldown.
- Read `journey/design.md` first as the canonical project snapshot.
- Fetched PR 17 into local branch `pr-17`.
- Ran `CI=true vp install` after checkout. The first plain `vp install` failed
  only because pnpm needed non-interactive module purge confirmation.
- Reproduced the Vercel failure locally with `vp run site#build`. The local
  stack matched Vercel: VitePress failed to load `.vitepress/config.ts` through
  `@voidzero-dev/vite-plus-core@0.1.23`.
- Confirmed the VitePress markdown plugin imports resolve normally from
  `packages/site`, so the failure was not a package resolution problem in the
  config file.
- Found that PR 17 had `vite-plus@0.1.22` but the workspace `vite` catalog
  alias still used `npm:@voidzero-dev/vite-plus-core@latest`, which let
  VitePress resolve `vite-plus-core@0.1.23`.
- Changed the `vite` alias to
  `npm:@voidzero-dev/vite-plus-core@0.1.22`; `vp run site#build` then passed.
- Also changed the `vitest` alias to
  `npm:@voidzero-dev/vite-plus-test@0.1.22` so both Vite+ aliases are exact and
  aligned with the local `vite-plus` package.
- Rechecked the official Vite+ upgrade docs after review. The docs say
  `vp update vite-plus` does not re-resolve the `vite` and `vitest` aliases,
  and a full project upgrade should update `vite-plus`,
  `@voidzero-dev/vite-plus-core`, and `@voidzero-dev/vite-plus-test` together.
- `vp info` showed `0.1.24` exists on the registry, but project
  `vp outdated` reported `vite-plus 0.1.23` as the current available upgrade
  line. The repo also has `minimumReleaseAge: "7 days"` in `renovate.json`, so
  the PR fix uses `0.1.23` rather than jumping manually to `0.1.24`.
- Replaced the earlier `0.1.22` alias pin with a full Vite+ line upgrade:
  `vite-plus@0.1.23`,
  `vite: npm:@voidzero-dev/vite-plus-core@0.1.23`, and
  `vitest: npm:@voidzero-dev/vite-plus-test@0.1.23`.
- `vp run site#build` passed on the `0.1.23` line, so directly upgrading the
  Vite+ toolchain line fixes the Vercel failure.
- Final validation on the `0.1.23` line passed:
  - `vp check`
  - `vp test`
  - `vp run site#build`
  - `vp run swrv#build`
- Validation passed:
  - `vp check`
  - `vp test`
  - `vp run site#build`
  - `vp run swrv#build`
- `vp run build -r` reported `0/0` tasks locally, so the meaningful build
  validation for the Vercel failure is the explicit `site#build` lane.
