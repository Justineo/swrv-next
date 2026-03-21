# Reflected cleanup pass

Date: 2026-03-22

## Summary

Implemented the remaining high-value cleanup set from the reflected repository
analysis and revalidated the repo afterward.

## Scope

- docs-site ownership drift
- dead internal runtime event surface
- duplicated tiny internal helpers
- `SWRVConfig` boundary semantics documentation

## Changes

- aligned docs-site source ownership to the current canonical repo and local
  branding assets
- removed the unused internal `"error-revalidate"` event concept
- deduplicated promise-like detection behind `_internal/promise-like.ts`
- documented the intentional one-time boundary creation semantics in
  `config-context.ts` and `config-utils.ts`
- updated `journey/design.md` to reflect the effective project snapshot

## Validation

- `vp test`
- `vp check`
