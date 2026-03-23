# Conventional Commit History Cleanup Log

Date: 2026-03-23

- Reviewed the recent commit history and found two non-conventional subjects at the tip of `main`.
- Planned a minimal history rewrite limited to those two commits.
- Created backup branch `backup/conventional-commit-cleanup-20260323` before rewriting history.
- Rewrote the commit subjects:
  - `b6bfb4a` -> `57434ef` `docs(journey): refine full-scale alignment prompt`
  - `16b3f86` -> `98b8517` `refactor(swrv): align structure with SWR`
- Verified the updated `git log` and confirmed only the new `journey/` records remained untracked.
