# PR 17 Vercel Build Fix

## Context

PR 17 updates the grouped non-major dependency set for `oxc-minify`,
`pnpm`, and `vite-plus`. The Vercel preview fails while VitePress loads
`packages/site/docs/.vitepress/config.ts`.

Observed failure:

- Command: `pnpm run build`
- Failing package path: `packages/site/docs/.vitepress/config.ts`
- Error: `TypeError: Cannot convert undefined or null to object`
- Stack: VitePress config bundling through Vite+ / Rolldown

## Plan

1. Check out PR 17 and run `vp install` so local dependency state matches the
   Renovate lockfile.
2. Reproduce the failing site build locally through the Vite+ workflow.
3. Isolate whether the crash is caused by a dependency version, VitePress
   config shape, or a plugin import path.
4. Apply the smallest repo-side fix that keeps the Renovate update acceptable.
5. Validate with `vp check`, `vp test`, and a site/root build path relevant to
   the Vercel failure.
6. Record the outcome in `journey/logs/2026-06-02-pr-17-vercel-build-fix.md`
   and update `journey/design.md` if the effective project understanding
   changes.
