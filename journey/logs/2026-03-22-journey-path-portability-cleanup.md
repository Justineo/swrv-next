# Journey path portability cleanup

Date: 2026-03-22

## Summary

Removed repo-root absolute paths from `journey/` notes so the shared project
memory now uses portable relative references for in-repo files.

## Scope

- journey note portability
- repo-root link cleanup
- validation and rescan afterward

## Changes

- converted repo-local absolute Markdown links in seven `journey/` notes to
  relative paths
- replaced the remaining plain-text repo-root path mention with a portable
  description of the current repository checkout
- left external local reference paths to the SWR and legacy SWRV source trees
  unchanged

## Validation

- `vp check`
- `vp test`
- `rg -n '/Users/yiling\\.gu@konghq\\.com/Developer/Kong/swrv-next' journey .`
