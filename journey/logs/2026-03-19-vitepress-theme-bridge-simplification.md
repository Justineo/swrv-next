# VitePress theme bridge simplification

Date: 2026-03-19

## Goal

Reduce the docs theme stylesheet from a large direct `--vp-*` token map to a simpler bridge from a smaller `--theme-*` design layer into the VitePress variables the site actually uses.

## Changes

- Replaced the broad direct token map in `packages/site/docs/.vitepress/theme/index.css` with:
  - shared `--theme-*` variables for color, typography, borders, and hero sizing
  - a smaller `--vp-*` bridge layer derived from those theme variables
- Kept the default VitePress layout and component styling intact.
- Added the requested heading typography mapping so hero headings and doc headings use `var(--font-family-space-grotesk)`.
- Kept the global `scrollbar-width: thin` rule in the same stylesheet.

## Validation

- `vp check --fix`
- `vp test`
- `vp run site#build`
