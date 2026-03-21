# Logo correction

Date: 2026-03-22

## Summary

Replaced the docs site's temporary SWR-like mark with the actual legacy SWRV
logo asset.

## Scope

- docs branding correction
- asset replacement
- validation after the change

## Changes

- copied the legacy SWRV `logo_45.png` asset into `packages/site/docs/public`
- repointed the docs theme logo and home hero image to `/swrv-logo.png`
- removed the obsolete temporary `mark.svg` asset
- updated `journey/design.md` to reflect the corrected docs branding

## Validation

- `vp check`
- `vp test`
- `vp run site#build`
