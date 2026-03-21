# Repository Markdown link cleanup

Date: 2026-03-22
Status: completed

## Goal

Remove machine-specific absolute filesystem paths from tracked repository
Markdown and restore portable repo-relative links.

## Scope

- fix leaked `/Users/.../swrv-next/...` Markdown links in contributor-facing docs
- keep the existing document structure and wording otherwise unchanged
- validate after the cleanup and rescan for other repo-local path leaks

## Plan

### T1. Fix tracked Markdown links

- replace absolute local links in `README.md`
- replace absolute local links in `CONTRIBUTING.md`

Status: completed

### T2. Validate and rescan

- run `vp check`
- run `vp test`
- rescan the repo for remaining absolute local links outside `journey/`

Status: completed
