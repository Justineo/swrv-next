# Home features copy

Date: 2026-03-20

## Completed

- kept the lower home section as plain Markdown for `Installation`, the credit block, and `Quick example`
- kept the current home-page split content:
  - `Installation` in the left column
  - a low-key SWR and Vercel attribution lockup directly under installation
  - `Quick example` in the right column
- switched feature copy to VitePress' built-in home `features` block in `packages/site/docs/index.md`
- aligned the final feature-card wording with the legacy SWRV home-page feature copy
- replaced the failed CTA-row, checklist, note, anatomy, and summary treatments with a simple attribution line that credits the original SWR project without turning the slot into another content section
- upgraded that attribution into a quieter SWR plus Vercel lockup, moved both marks into local public SVG assets, and removed hover treatment on the brand links
- replaced the custom component layout with CSS-only placement for the Markdown content
- removed the old `:nth-child()` grid placement rules and replaced them with an explicit equal-width two-column split
- dropped the custom home-page `h2` override so the lower section now uses default VitePress heading rhythm
- corrected the quick example so the referenced `fetcher` function is defined inline again

## Verification

- `vp check --fix`
- `vp run site#build`
- `vp test`
- browser review of the built site on desktop and mobile
- inspected the generated `packages/site/docs/.vitepress/dist/index.html` to confirm:
  - the SWR and Vercel credit remains under installation
  - feature copy renders through VitePress' built-in home-feature output
  - the two lower columns no longer share implicit markdown row heights
