# Home layout selector cleanup

Date: 2026-03-22
Status: completed

## Goal

Remove brittle `:nth-child()` layout rules from the docs home page and replace
them with selectors tied to the actual semantic sections.

## Scope

- update the docs home CSS layout selectors
- keep the visual layout unchanged
- validate the docs build path after the CSS refactor

## Plan

### T1. Replace brittle selectors

- target the home page sections by heading ids and explicit section classes
- keep the existing two-column desktop and stacked mobile layout

Status: completed

### T2. Validate and rescan

- run `vp check`
- run `vp test`
- run `vp run site#build`

Status: completed
