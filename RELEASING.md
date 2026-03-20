# Releasing

## Scope

This guide covers the repo-side release flow for `swrv`.

It does not replace external maintainer checks such as npm Trusted Publisher
production setup or the final decision to cut a stable tag.

## Release lanes

### Prerelease lane

Use the `next` dist-tag while the rewritten `2.x` line is still in prerelease.

Current package versioning and workflows are aligned to this path.

### Stable lane

Use the stable npm tag only after:

- the repo-side validation gates pass
- the npm package record and Trusted Publisher settings are verified
- maintainers agree on the stable release window and notes

## Required validation

Use the root verification command for the full repo-side release gate:

```bash
vp run release:verify
```

That command runs repository validation, browser e2e, package dry-runs, and a
packed consumer smoke test against the built tarball.

For the underlying commands, run these before creating or approving a release:

```bash
vp run swrv#check -- --fix
vp test packages/swrv/tests
vp exec playwright test
vp run build -r
```

## Package validation

From `packages/swrv`:

```bash
vp run release:verify
```

Check:

- built `dist` files are present
- export paths resolve correctly
- declarations are included
- `README.md`, `LICENSE`, and `package.json` are present
- the packed tarball installs into a clean consumer project
- root and subpath imports typecheck and runtime-load from the tarball

## Versioning

Use the root version-bump scripts:

```bash
vp run release:patch
vp run release:minor
vp run release:major
```

These scripts drive `bumpp` across the workspace and create the corresponding
commit and tag.

## Release workflow

### Workflow-dispatch preparation

The GitHub Actions release workflow supports a manual version-bump path.
Use it when maintainers want GitHub Actions to perform the bump and tag flow.

### Tag-driven publish

Tag pushes matching `v*` run the publish job. That job will:

1. install dependencies
2. run validation
3. run package dry-runs
4. publish the package through `vp pm publish`
5. create the GitHub release entry

## External maintainer checks

These are required for a real release, but they cannot be closed purely from
inside this repo:

- confirm npm Trusted Publisher production settings for `swrv`
- confirm the npm package record is linked to the GitHub repository
- decide whether the release is another prerelease or the first stable cut
- prepare the actual release notes for the chosen release window

## Release-note inputs

Use these sources when preparing release notes:

- `journey/design.md`
- `journey/research/2026-03-20-final-project-status-assessment.md`
- `journey/research/2026-03-20-final-swr-deviation-audit.md`
- `journey/logs/2026-03-18-swrv-rebuild-roadmap.md`
- `journey/logs/2026-03-19-simplification-phase-1-3.md`
- `journey/logs/2026-03-19-simplification-phase-4-5.md`
- `journey/logs/2026-03-20-final-production-readiness-improvements.md`
- merged commits since the previous published prerelease

Focus release notes on:

- public API changes
- SWR parity changes
- intentional Vue-native differences
- migration-impacting changes for legacy SWRV users

## Current non-release blockers

The main intentionally deferred repo-side area is Suspense. It is not part of
the non-suspense stable-release lane unless maintainers explicitly reopen that
scope.
