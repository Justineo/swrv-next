# SWR Alignment Gap Investigation Log

Date: 2026-03-22

- Started a detailed investigation pass to map structural drift against the
  local SWR source before changing runtime organization again.
- Compared SWRV and SWR module trees, public entrypoints, `_internal` barrels,
  config composition, helper ownership, and feature-module organization.
- Identified the largest remaining structural drift in `_internal` composition,
  built-in middleware and preload flow, infinite helper placement, subscription
  organization, and entrypoint wrapper shape.
- Recorded the detailed findings in
  `journey/research/2026-03-22-swr-alignment-gap-investigation.md`.
- Updated `journey/design.md` so the canonical project snapshot reflects the
  newly confirmed structural alignment gaps instead of the earlier
  "no remaining safe drift" conclusion.
