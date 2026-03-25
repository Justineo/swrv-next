# Theme token adaptation

Date: 2026-03-25

## Progress

- Read `journey/design.md` and the prior VitePress theme history to keep this change aligned with the existing bridge-based theming approach.
- Identified `packages/site/docs/.vitepress/theme/index.css` as the canonical token owner for the docs site theme.
- Confirmed the worktree is clean before editing.
- Replaced the previous minimal light and dark theme token layer with a fuller semantic `--theme-*` palette derived from the latest supplied tokens.
- Kept the existing bridge pattern: VitePress `--vp-*` variables now map from the richer theme tokens for backgrounds, text, brand, code blocks, buttons, custom blocks, badges, search, and nav surfaces.
- Updated the docs `theme-color` metadata to match the new light and dark base colors.

## Validation

- `vp install`
- `vp test`
- `vp check --fix`
- `vp run site#build`
- Verified in-browser via a local static server on port `8123`; computed light mode resolves to `--vp-c-bg: #cdd4cb` and dark mode resolves to `--vp-c-bg: #001408`, with `--vp-c-brand-3: #cf0` in both modes.
