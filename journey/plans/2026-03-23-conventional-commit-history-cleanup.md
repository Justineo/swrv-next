# Conventional Commit History Cleanup

Date: 2026-03-23

## Goal

Rewrite the recent non-conventional commit subjects at the tip of `main` into conventional-commit form without changing their content.

## Scope

- Review recent commit subjects.
- Identify commits that do not follow conventional-commit format.
- Rewrite only the affected recent commits.
- Verify the updated history and worktree state.

## Target Commits

- `b6bfb4a` `Refine full-scale alignment prompt`
- `16b3f86` `Align SWRV structure with SWR`

## Planned Replacements

- `b6bfb4a` -> `docs(journey): refine full-scale alignment prompt`
- `16b3f86` -> `refactor(swrv): align structure with SWR`

## Verification

- `git log --oneline -n 12`
- `git status --short`
