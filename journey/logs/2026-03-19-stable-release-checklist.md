# SWRV Stable Release Checklist

## Scope

This checklist is for moving from the current validated prerelease cut to the
first stable `2.x` release.

## Repo-Side Checks

- [x] `vp check`
- [x] `vp test`
- [x] browser e2e through `vp exec playwright test`
- [x] docs build through `vp run build -r`
- [x] package build through `vp run build -r`
- [x] package pack dry-run from `packages/swrv`
- [x] package publish dry-run from `packages/swrv`
- [x] packed tarball consumer smoke validation through `vp run swrv#release:verify`
- [x] root release-verification command through `vp run release:verify`
- [x] explicit release workflow wired through GitHub Actions
- [x] contributor and security docs in place
- [x] roadmap, design snapshot, and simplification logs updated to the current cut

## Docs And Product Checks

- [x] docs now carry stable product-status information inline instead of through a separate status page
- [x] parity page clarifying SWR, Vue-native, and legacy SWRV relationships
- [x] migration page with concrete migration guidance
- [x] API page documenting the exported hook and helper surface

## Still Requires Maintainer Or External Verification

- [ ] confirm npm Trusted Publisher production settings for the real package
- [ ] confirm the npm package record is linked to the GitHub repository
- [ ] decide whether to cut a final prerelease after the latest simplification work or go directly to stable
- [ ] prepare the actual stable release notes for the chosen release window

## Release Notes Inputs

Use these as the main inputs for the final stable release notes:

- `journey/design.md`
- `journey/logs/2026-03-18-swrv-rebuild-roadmap.md`
- `journey/logs/2026-03-19-simplification-phase-1-3.md`
- `journey/logs/2026-03-19-simplification-phase-4-5.md`
- the commits since the previous published prerelease

## Notes

- Suspense is explicitly deferred from the first stable `2.0` release and should not block the
  current stable-release lane unless product scope changes.
- In the current worktree, root `vp check` and `vp run release:verify` are blocked only by the
  untouched formatting state of `packages/site/docs/.vitepress/theme/index.css`.
- External publisher verification is the main remaining blocker that cannot be
  closed purely from inside the repository.
