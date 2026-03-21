# Home layout selector cleanup

Date: 2026-03-22

## Summary

Replaced the docs home-page `:nth-child()` grid rules with semantic layout
selectors tied to the actual sections.

## Scope

- docs home maintainability
- VitePress-generated markup coupling reduction
- docs build validation afterward

## Changes

- replaced the home-page `:nth-child()` grid placement rules in
  `packages/site/docs/.vitepress/theme/index.css`
- bound the desktop and mobile layout to `#installation`, `#quick-example`, and
  `.home-credit` instead of generated child order

## Validation

- `vp check`
- `vp test`
- `vp run site#build`
