# Repository Markdown link cleanup

Date: 2026-03-22

## Summary

Removed absolute local filesystem paths from tracked repository Markdown and
restored repo-relative links.

## Scope

- README and contributing docs portability
- removal of machine-specific local paths
- validation and repo rescan afterward

## Changes

- replaced absolute local links in `README.md` with repo-relative links
- replaced the leaked absolute local link in `CONTRIBUTING.md`
- rescanned tracked repository docs outside `journey/` for remaining repo-root
  path leaks

## Validation

- `vp check`
- `vp test`
- `rg -n '/Users/yiling\\.gu@konghq\\.com/Developer/Kong/swrv-next' . --glob '!journey/**'`
