# Home features copy plan

Date: 2026-03-20

## Goal

Add a proper feature-copy section to the site home page while preserving the current top-level layout choices:

- keep the hero as-is
- keep `Installation` in the left column
- keep a low-key attribution or companion line directly under `Installation`
- keep `Quick example` in the right column
- render feature copy through VitePress' built-in home `features` support instead of a custom HTML section

## Content direction

- Follow SWR's home-page content structure as a reference, but do not copy its CTA-row layout.
- Reuse the legacy SWRV home-page feature copy for the built-in feature cards.
- Treat the section under Installation as a low-key attribution or companion line, not a separate card or full-width CTA row.
- Prefer built-in VitePress home features over custom feature-grid markup.

## Implementation steps

1. Update `packages/site/docs/index.md`
   - Keep the hero and built-in `features` frontmatter intact.
   - Keep the lower section as plain Markdown content for `Installation`, the credit block, and `Quick example`.
   - Move the SWR and Vercel marks into `packages/site/docs/public` and reference them through local `<img>` tags instead of inline SVG markup.
   - Keep the credit content under Installation restrained enough to feel like provenance rather than another content section.

2. Update `packages/site/docs/.vitepress/theme/index.css`
   - Use CSS-only placement to map the Markdown content into the desired two-column layout.
   - Style the new lower section as a clean two-column split with equal-width columns.
   - Keep default VitePress heading rhythm instead of special-casing home-page `h2` elements.
   - Keep the attribution line compact and attached to the install rail instead of turning it into a card or CTA.

3. Verify
   - `vp check --fix`
   - `vp run site#build`
   - `vp test`
   - Inspect the built home page on desktop and mobile to confirm the lower section reads as two independent columns.
