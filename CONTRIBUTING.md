# Contributing

## Development Workflow

This repository uses Vite+ for package management, validation, and build
orchestration. Use `vp`, not `pnpm`, `npm`, or `yarn`, for normal project
commands.

```bash
vp install
vp check
vp run test -r
vp exec playwright install chromium
vp run test:e2e
vp run build -r
```

Useful package-local commands:

```bash
vp run site#dev
vp run release:verify
```

## Repository Structure

- `packages/swrv`: published library package
- `packages/site`: VitePress documentation site
- `journey/design.md`: canonical design snapshot and current project decisions
- `journey/logs`: dated execution notes for completed phases or significant work
- `journey/plans`: only for roadmap, architecture, or implementation planning
  work that needs extra coordination

## Contribution Expectations

- Treat SWR as the primary behavioral and API reference.
- Keep Vue-facing behavior idiomatic: refs, composables, and explicit cache
  boundaries.
- Update `journey/design.md` whenever effective project decisions change.
- Add or update tests for behavior, type surface, or packaging changes.
- Validate with `vp check`, `vp run test -r`, and `vp run test:e2e` before sending a patch.

## Releases

Repository-side release automation is wired through GitHub Actions and Trusted
Publisher-compatible npm publishing. Until the final versioning line is locked,
the repo is configured for prerelease-style publishing under the `next` dist
tag.

Use [RELEASING.md](RELEASING.md) as the
canonical repo-side release guide.

Version bumps use the root release scripts:

```bash
vp run release:patch
vp run release:minor
vp run release:major
```

For the actual validation, dry-run, note-preparation, and external verification
steps, follow `RELEASING.md`.
