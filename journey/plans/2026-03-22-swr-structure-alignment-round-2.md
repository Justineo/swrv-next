# SWR Structure Alignment Round 2

Date: 2026-03-22

## Goal

Run another source-structure alignment pass against the local SWR reference so
SWRV stays as close as practical on:

- API shape
- concepts and naming
- type surfaces
- module and helper organization
- internal logic placement

while keeping the explicit Vue-only divergences that are already intentional.

## Alignment rules

1. Prefer SWR's module and helper placement unless Vue-specific runtime
   constraints require a different shape.
2. Do not preserve local helper extraction just because it is "cleaner" if it
   creates structural drift from SWR without strong benefit.
3. Keep explicit Vue-only differences:
   - refs and watchers
   - provide/inject config flow
   - provider-scoped client state
   - explicit SSR snapshot helpers
4. Treat SWR source as the default answer for naming and organization
   questions, not prior local preferences.

## Planned work

1. Re-map current drift against local SWR for:
   - `_internal`
   - base hook entry and argument resolution
   - `infinite`
   - `mutation`
   - `subscription`
2. Revert or reshape any recent helper placement that moved away from SWR
   without clear runtime need.
3. Implement the highest-confidence structural alignment changes.
4. Re-run package validation and record results.
