# TTL removal and runtime simplification

Date: 2026-03-19
Status: complete

## Summary

Removed `ttl` from the rebuilt core API and deleted the associated expiry machinery from the
runtime.

## Main changes

- removed `ttl` from public and resolved configuration types
- removed `expiresAt` and `updatedAt` from cache state
- made cache reads pure by deleting expiry-on-read behavior
- simplified `SWRVClient.setState()` and the cache-helper write path so they no longer accept TTL
- removed TTL plumbing from `use-swrv-handler`, `infinite`, snapshot hydration, and mutation flows
- removed TTL-specific tests and kept lifecycle cleanup coverage under
  `core-client-cleanup.test.ts`
- removed TTL mentions from public docs and README
- updated the design snapshot to reflect that cache expiry now belongs at provider level, not hook
  level

## Validation

- `vp test`
- `vp run build -r`

`vp check` is still blocked by formatting in
`packages/site/docs/.vitepress/theme/index.css`, which was intentionally left untouched because it
contained separate in-progress user changes.
