# Final project status assessment

Date: 2026-03-20
Status: current

## Executive assessment

`swrv-next` is now at a high-quality prerelease standard on the repo side.

Practical score:

- runtime and API quality: high
- test and packaging confidence: high
- docs structure and parity: high
- release-process clarity: high
- project-memory consistency: high

Overall, the project is no longer missing foundational engineering work. The remaining blockers are
either external release checks or intentionally deferred product scope.

## What is already solved

### Runtime and parity

- The core SWR-shaped surface exists and is validated:
  - `useSWRV`
  - `SWRVConfig`
  - scoped and global `mutate`
  - `preload`
  - `immutable`
  - `infinite`
  - `mutation`
  - `subscription`
- Core runtime behavior is strongly aligned with SWR in the non-React-only lane:
  - dedupe
  - retry policy
  - focus and reconnect
  - cached-error mount guard
  - infinite mount behavior
  - mutation callback semantics
  - subscription updater semantics
  - SSR-safe non-fetching plus snapshot hydration
- The old `ttl` and `serverTTL` divergence is removed from core.

### Types and tests

- Public types are materially stronger than legacy SWRV and mostly aligned with SWR's intent.
- Upstream parity coverage is broad, and the non-suspense matrix is closed.
- The library suite, browser e2e path, and packed-consumer smoke lane are green.
- Package build, pack dry-runs, and publish dry-runs are green.

### Tooling, docs, and automation

- The monorepo shape is correct.
- The docs tree follows SWR's information architecture.
- CI, release automation, Renovate, dry-run publishing, and a repo-level `RELEASING.md` guide exist.
- The project has strong shared memory in `journey/`.

## Remaining repo-side gaps

### 1. A small documented type boundary remains in core source

The repo-side type hygiene pass is effectively complete, but two localized framework-facing
boundaries remain by design:

- `SWRVConfigurationValue<any, any>` at the Vue prop boundary for `SWRVConfig`
- the middleware-bridge cast in `_internal/with-middleware.ts`

These are documented trade-offs rather than untracked debt.

### 2. External blockers remain, but they are outside the repo

These are real gaps to a true stable release, but they are not fully executable here:

- npm Trusted Publisher production verification
- final stable-tag decision
- stable release-note preparation for the actual release window
- final product decision on the deferred Suspense lane only if maintainers want to reopen it

These should be recorded clearly as external or decision-bound blockers, not left implied.

### 3. Current root-worktree verification can still be blocked by unrelated local edits

In this specific worktree, the untouched user edits in
`packages/site/docs/.vitepress/theme/index.css` still block root-wide `vp check` and therefore the
root `vp run release:verify` command. The package-local release-verification lane is green.

## Ideal-state conclusion

For the repo itself, the project is now effectively in release-execution territory rather than
improvement-plan territory. The remaining blockers are mostly external release checks or explicitly
deferred scope, not codebase maturity problems.
