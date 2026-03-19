# SWRV Next Remaining Work Without Suspense

Date: 2026-03-19
Status: Active

Status note:

- This file described the release-closure lane before the pre-stable refinement pass reopened in-repo work.
- The refinement pass in `journey/plans/2026-03-19-pre-stable-refinement-plan.md` is now complete, so this file once again reflects the active non-suspense remaining work.

## Context

`swrv-next` is now at a strong prerelease state:

- monorepo shape is stable
- runtime, docs, CI, pack, and publish dry-runs pass
- `vp test` currently passes with 24 files and 216 tests
- major SWR-aligned surfaces already exist for base hook, `immutable`, `infinite`, `mutation`, `subscription`, SSR snapshot helpers, devtools middleware, and release automation
- the active non-suspense upstream parity matrix is fully closed
- the planned internal simplification pass is fully closed

For the moment, `suspense` is intentionally left out of the active execution lane.
Its feasibility and constraints are recorded in:

- [journey/research/2026-03-19-vue-suspense-feasibility.md](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/journey/research/2026-03-19-vue-suspense-feasibility.md)

## Remaining Active Work

### 1. Reference-Quality Docs and Migration Closure

Objective:

- move from good working docs to stable-release docs

Remaining tasks:

- complete

Closed in the current repo state:

- the API page now documents the main exported hooks and helpers
- the docs site now has an explicit status page
- the parity page now clarifies the SWR, Vue-native, and legacy SWRV relationships
- the migration page now includes concrete migration guidance

### 2. Stable Release Closure

Objective:

- move from validated prerelease to stable release readiness

Remaining tasks:

- create a concrete stable-release checklist in `journey/logs/`
  Closed in `journey/logs/2026-03-19-stable-release-checklist.md`.
- run final packed-artifact audits
  Closed for the repo-side dry-run path.
- verify trusted publisher production settings, not only dry-runs
  This remains partly external to the repo and may need maintainer action.
- finalize the stable changelog and release notes process
  Closed at the repo-guidance level in `CONTRIBUTING.md`, but the actual stable notes still need to be prepared at release time.
- explicitly close the roadmap cut in logs once the above are done

### 3. Immediate Remaining Work

At this point, the only remaining non-suspense work that is clearly still open is:

- maintainer-side Trusted Publisher production verification
- the actual decision to cut one more prerelease or go straight to stable
- the final stable release notes and stable tag execution

### 4. Optional Follow-Up Work That Is Not Part of the Active Lane

These are real tasks, but they are no longer blockers for the current non-suspense prerelease cut:

- any deeper post-parity tuning in `infinite`, `mutation`, or `subscription`
- more type-level precision beyond the current public surface
- future internal simplification beyond the current helper-backed client boundary
- deeper framework integration beyond the current explicit SSR and hydration contract

## Deferred Work

### Suspense

Deferred for now.

Current state:

- mount-time suspension looks technically viable
- later key-change re-suspension is not cleanly available through the same Vue mechanism

Implication:

- `suspense` should stay out of the current execution lane until product scope is decided

## Recommended Order

1. Verify the external npm Trusted Publisher production setup.
2. Decide whether to cut one more prerelease or go directly to stable.
3. Prepare the actual stable release notes and execute the stable tag.
4. Leave suspense and broader framework integration explicitly deferred until product scope changes.

## Practical Next Task

The next highest-value task is:

- outside the repo, verify Trusted Publisher production readiness for the real `swrv` package record

Inside the repo, the next optional work is no longer a blocker. It is follow-up polish or deferred scope, not release-lane infrastructure.
