# Complete docs md audit and alignment

Status: complete
Date: 2026-03-19

## Goal

Audit every Markdown page under `packages/site/docs` against the local SWR docs source and tighten any remaining drift unless the difference is clearly required by Vue semantics, SWRV-specific APIs, deferred features, or previously locked product decisions.

## Scope

- All Markdown pages under `packages/site/docs`
- Content structure, section ordering, explanatory depth, inline cross-links, terminology, and example intent
- No changes to `packages/site/docs/.vitepress/theme/index.css`

## Constraints

- Keep Vue-correct composable usage in examples. `useSWRV`-family composables must appear inside `setup()` or `<script setup>`.
- Preserve intentional SWRV-specific divergence:
  - no React-only server component guidance
  - no suspense docs until the suspense scope is reopened
  - `with-nextjs` remains `server-rendering-and-hydration`
  - `Migrate from v1` remains SWRV-specific
- Prefer matching SWR’s narrative and examples whenever the concept applies directly.

## Work plan

1. Build a page map from `packages/site/docs/**/*.md` to the matching SWR docs source file.
2. Audit every page for:
   - missing sections
   - thinner explanations
   - missing inline cross-links
   - example drift where SWR’s example intent can be preserved in Vue
   - outdated SWRV-specific framing
3. Record a file-by-file drift log with severity and disposition:
   - `align now`
   - `intentional divergence`
   - `deferred`
4. Tackle all `align now` items in batches.
5. Re-run the audit after edits and confirm that remaining drift is only intentional or deferred.
6. Update `journey/design.md` and add a completion log.

## Deliverables

- Completed file-by-file drift log in `journey/logs/`
- Tightened docs pages under `packages/site/docs`
- Updated design snapshot summarizing what still intentionally differs
