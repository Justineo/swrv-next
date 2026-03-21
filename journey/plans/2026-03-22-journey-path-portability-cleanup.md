# Journey path portability cleanup

Date: 2026-03-22
Status: completed

## Goal

Remove machine-specific repo-root absolute paths from `journey/` notes so the
shared project memory stays portable across checkouts and machines.

## Scope

- convert repo-local absolute Markdown links in `journey/` to relative links
- fix the remaining plain-text repo-root path mention
- leave references to external local repos untouched for now

## Plan

### T1. Rewrite repo-local links in journey notes

- convert links that point into this repo root to relative paths from each note
- keep hashes and file references intact

Status: completed

### T2. Validate and rescan

- run `vp check`
- run `vp test`
- rescan `journey/` for remaining repo-root path leaks

Status: completed
