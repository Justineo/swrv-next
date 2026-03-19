# SWR docs tightening plan

Status: complete

## Goal

Reduce the remaining content drift between the SWRV docs and the upstream SWR docs after the first
copy-alignment pass.

## Priority pages

1. `advanced/performance`
2. `advanced/understanding`
3. `mutation`
4. `pagination`
5. `server-rendering-and-hydration`
6. `middleware`

## Approach

1. Re-audit each page against the upstream SWR doc source.
2. Restore missing explanatory examples and section depth where the concept still applies to SWRV.
3. Keep Vue-specific divergences explicit instead of inventing new structure.
4. Revalidate the site and update journey memory.
