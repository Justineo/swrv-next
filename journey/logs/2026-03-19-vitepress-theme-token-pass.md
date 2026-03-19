# VitePress theme token pass

Date: 2026-03-19

## Goal

Keep the default VitePress layout and components, but theme the site through CSS variables instead of only changing a small set of accent colors.

## Changes

- Expanded `packages/site/docs/.vitepress/theme/index.css` from a narrow brand-color override into a broader VitePress token layer.
- Added light and dark mode tokens for:
  - page and surface backgrounds
  - text hierarchy
  - borders and gutters
  - default, brand, success, warning, and danger colors
  - brand and alt button states
  - nav, local nav, sidebar, and local search surfaces
  - home hero accent handling
- Kept the default VitePress layout and component styling intact with no structural CSS overrides.

## Validation

- `vp check`
- `vp test`
- `vp run site#build`
