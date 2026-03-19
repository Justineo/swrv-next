# VitePress default shell refinement

Date: 2026-03-19

## Goal

Move the docs shell back toward default VitePress primitives while keeping the SWRV brand colors and adding generated multi-manager install commands with `vp`.

## Changes

- Replaced the custom home component with the default VitePress `layout: home` page in `packages/site/docs/index.md`.
- Removed the custom home component from the theme layer and kept `packages/site/docs/.vitepress/theme/index.ts` focused on tabs enhancement only.
- Reduced `packages/site/docs/.vitepress/theme/index.css` to VitePress color-token overrides only.
- Added `vitepress-plugin-npm-commands` and `vitepress-plugin-tabs` to the docs package.
- Added `packages/site/docs/.vitepress/plugins/vp-install-tabs.ts` so install fences can render `npm`, `yarn`, `pnpm`, `bun`, and `vp` tabs from a single source fence.
- Updated install snippets in `packages/site/docs/index.md` and `packages/site/docs/getting-started.md` to use the generated command tabs.

## Validation

- `vp check`
- `vp test`
- `vp run build -r`
