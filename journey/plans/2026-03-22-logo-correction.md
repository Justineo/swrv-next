# Logo correction

Date: 2026-03-22
Status: completed

## Goal

Replace the docs site's temporary SWR-like mark with the actual SWRV logo
asset from the legacy project.

## Scope

- swap the docs theme and home-page logo asset
- remove the incorrect temporary asset
- validate the docs build afterward

## Plan

### T1. Replace the logo asset

- copy the legacy SWRV logo into the docs public directory
- repoint the docs theme and home page to the real SWRV asset

Status: completed

### T2. Validate and record

- run `vp check`
- run `vp test`
- run `vp run site#build`
- update `journey/design.md` to reflect the corrected branding asset

Status: completed
