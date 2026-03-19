# Theme token dual-mode fix

Date: 2026-03-19

## Goal

Fix the docs theme so light and dark mode both derive from explicit `--theme-*` token sets, and make the font tokens work by loading the actual font families used by the theme.

## Changes

- Reworked `packages/site/docs/.vitepress/theme/index.css` so:
  - `:root` defines the light-mode `--theme-*` tokens
  - `.dark` defines the dark-mode `--theme-*` tokens
  - a shared `:root, .dark` block maps VitePress `--vp-*` variables from those theme tokens
- Added a font import for Roboto and Space Grotesk.
- Wired base copy to the Roboto token and hero or heading typography to the Space Grotesk token.
- Kept the default VitePress structure and the global `scrollbar-width: thin` rule.

## Validation

- `vp check`
- `vp test`
- `vp run site#build`
- inspected `packages/site/docs/.vitepress/dist/index.html` to confirm the generated site carries the expected theme output
