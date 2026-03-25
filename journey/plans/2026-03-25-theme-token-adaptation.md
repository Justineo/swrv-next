# Theme token adaptation

Date: 2026-03-25

## Goal

Adapt the docs site's current VitePress theme bridge to a fuller `--theme-*` token set based on the latest supplied palette, while keeping the existing site structure and component overrides intact.

## Plan

1. Inspect the current docs theme token owner and recent theme-related journey notes to preserve the established token-bridge pattern.
2. Replace the minimal light and dark semantic tokens in `packages/site/docs/.vitepress/theme/index.css` with a more complete theme token layer derived from the supplied palette.
3. Map the VitePress `--vp-*` variables from the expanded theme token layer instead of from one-off hard-coded colors.
4. Update any related theme metadata that should reflect the new light and dark base colors.
5. Run the relevant validation commands and record the result in the journey log.
