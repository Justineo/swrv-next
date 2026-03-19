# Docs drift audit plan

Status: complete

Date: 2026-03-19

## Goal

Audit `packages/site/docs` against the upstream SWR docs in `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs`, focusing only on material remaining drift that still applies to SWRV after the recent copy-alignment pass.

## Scope

- Compare shared pages only.
- Ignore styling differences.
- Ignore local-only pages or intentionally divergent Vue/SWRV-only pages.
- Prioritize structure, copy coverage, and example intent drift.

## Steps

1. Inventory the overlapping doc pages between SWRV and upstream SWR.
2. Compare headings and section flow for each overlapping page.
3. Inspect pages with meaningful structural or narrative differences.
4. Return a concise prioritized list of still-applicable drift.
