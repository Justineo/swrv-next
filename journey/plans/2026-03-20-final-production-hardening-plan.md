# Final production hardening plan

Date: 2026-03-20
Status: completed

## Purpose

After the final SWR-alignment pass, the repo is functionally close to stable quality, but the
journey audit still shows four repo-side gaps that prevent calling the codebase fully
production-hardened:

1. scope and project-memory contradictions remain around `suspense`, release readiness, and older
   status-page language
2. a small amount of avoidable `any` and cast-heavy typing remains in source and test helpers
3. release validation still lacks a real packed-tarball consumer smoke test
4. repository-facing docs still drift in a few places from the actual Vue usage contract and
   current release workflow

This plan closes those gaps completely inside the repository. External maintainer actions like npm
Trusted Publisher production settings are noted but not treated as executable tasks here.

## Current quality assessment

- Runtime parity and behavior coverage: strong
- Type quality: strong, but not fully cleaned
- Docs structure and guide coverage: strong
- Release engineering: strong dry-run coverage, but missing consumer-install proof
- Project memory: good, but currently inconsistent in a few important places

Estimated repo-side completion before this pass: about 92% to 95%.

## Task list

### T1. Freeze the first stable scope and clean journey memory

Objectives:

- explicitly defer `suspense` from the first stable `2.0` release
- remove stale references to the old docs status page
- make the latest release-readiness and alignment state consistent across current journey documents

Files likely involved:

- `journey/design.md`
- `journey/logs/2026-03-19-stable-release-checklist.md`
- `journey/plans/2026-03-19-upstream-test-matrix.md`
- any current journey file that still states an outdated scope or release condition

Acceptance criteria:

- current journey memory has one unambiguous stable-scope position for `suspense`
- no current checklist still claims a separate docs status page exists
- release-readiness notes match the actual repo state

### T2. Remove the last avoidable source-level `any` and cast-heavy typing

Objectives:

- eliminate or reduce the remaining avoidable `any` usage in source
- tighten provider and config prop typing
- remove the remaining source-level `as unknown as` middleware coercion if possible

Files likely involved:

- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/_internal/with-middleware.ts`
- related type tests and provider tests

Acceptance criteria:

- source-level `any` is reduced to only clearly unavoidable framework-facing cases
- source-level `as unknown as` is removed or reduced to a single documented unavoidable boundary
- tests still prove the resulting public and provider behavior

### T3. Add real consumer smoke validation for the packed package

Objectives:

- validate the actual packed tarball in a clean temporary consumer project
- prove install, root import, subpath imports, runtime loading, and TypeScript usage
- integrate that check into a repeatable release-verification workflow

Files likely involved:

- new release-smoke script under `packages/swrv/scripts/`
- root release-verification script or command
- root and package `package.json`
- release checklist docs

Acceptance criteria:

- the repo can run one command that exercises build, tests, browser e2e, pack, publish dry-run, and
  tarball consumer smoke validation
- the smoke test installs the packed tarball, imports root and subpath entries, and typechecks

### T4. Align repository-facing docs and examples with the actual product contract

Objectives:

- make repository READMEs reflect Vue `setup()` semantics
- align install guidance with the current docs policy
- mention the new release-verification path

Files likely involved:

- `README.md`
- `packages/swrv/README.md`
- release checklist and design snapshot

Acceptance criteria:

- repository-facing examples no longer show invalid top-level composable usage
- install commands align with the current docs direction
- release-validation guidance is discoverable

### T5. Verify and record the completed state

Objectives:

- run the full repo-side validation for this pass
- write the completion log
- update the design snapshot with the final state

Validation target:

- `vp run swrv#check -- --fix`
- `vp test packages/swrv/tests`
- `vp run swrv#build`
- `vp exec playwright test`
- `vp run build -r`
- new release verification command

## Outcome target

When this plan is complete, there should be no remaining repo-side production-hardening work left
other than external maintainer verification steps.

## Completion notes

- T1 completed: current journey memory now uses one stable-scope position for deferred Suspense,
  removed stale docs-status references, and reconciled the latest release-readiness notes.
- T2 completed: source-level typing is reduced to the current Vue prop boundary and one documented
  middleware bridge; package-local check and type tests are green.
- T3 completed: `packages/swrv/scripts/release-smoke.mjs` now validates the packed tarball in a
  clean consumer project, and root plus package `release:verify` commands are wired.
- T4 completed: root and package READMEs plus `RELEASING.md` now reflect Vue `setup()` semantics,
  the current install policy, and the release-verification path.
- T5 completed on the repo-owned files: package-local validation and release verification are
  green. In this worktree, root-wide `vp check` and `vp run release:verify` remain blocked only by
  untouched edits in `packages/site/docs/.vitepress/theme/index.css`.
