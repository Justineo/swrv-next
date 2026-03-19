# Pre-stable refinement complete

Date: 2026-03-19
Status: Complete

## Scope closed

The pre-stable refinement lane from `journey/plans/2026-03-19-pre-stable-refinement-plan.md` is complete for the current scope.

Closed workstreams:

- type precision and API surface cleanup
- final simplification and naming pass
- docs information-architecture rebuild
- docs-site redesign and sentence-case copy sweep

## Main implementation outcomes

- reduced the runtime type and cast debt to a small number of deliberate internal boundaries
- replaced the cast-heavy advanced-hook middleware path with an explicit feature-middleware composition helper
- removed the no-longer-necessary internal `with-middleware` abstraction
- simplified naming in the core hook, infinite, and mutation internals
- rewrote the docs tree to follow the real SWR docs source structure from `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs`
- replaced the temporary docs site with a custom VitePress theme, a new home page, and a SWR-shaped sidebar and nav model

## Review rounds

### Review round 1: Type and runtime review

Checks:

- reduced `any`, `as unknown as`, and `as never` usage across `packages/swrv/src`
- revalidated `useSWRV`, `infinite`, `mutation`, and `subscription` behavior through the normal test suite

Outcome:

- accepted, with the remaining `any` usage limited to a small Vue prop-typing boundary and a small internal feature-middleware coercion point

### Review round 2: Docs and design review

Checks:

- rebuilt the docs tree around the SWR source structure
- rebuilt the home page and docs chrome with a custom theme layer
- reviewed the home page and a docs page in a browser preview

Outcome:

- accepted, with no further safe structural changes needed for the current scope

### Review round 3: Release-readiness review

Checks:

- `vp run ready`
- package dry-run
- publish dry-run

Outcome:

- accepted

## Remaining work after this phase

The remaining non-suspense work is no longer a refinement pass. It is stable-release execution:

- maintainer-side Trusted Publisher production verification
- stable release-note preparation
- the actual stable tag and publish decision
