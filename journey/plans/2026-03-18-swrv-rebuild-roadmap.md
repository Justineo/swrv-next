# SWRV Rebuild Roadmap

Date: 2026-03-18
Status: Planning

## Planning Basis

This plan is grounded in four current facts:

- `journey/research/swr-vs-swrv.md` shows the main drift areas: release surface, API surface, runtime model, mutation semantics, specialized APIs, and SSR.
- The new repo is still the Vite+ starter scaffold. It must first be reshaped into the actual target monorepo.
- Local SWR 2.4.1 is a much broader reference surface than legacy SWRV 1.1.0:
  - SWR has 41 source files and 65 test/e2e/type files in the inspected local tree.
  - Legacy SWRV has 7 source files and 7 test files in the inspected local tree.
- The highest-risk gaps are not only tooling gaps. They are runtime-shape gaps: provider-scoped state vs singleton caches, richer mutation semantics, specialized APIs, and SSR safety.

## 1. Project Decomposition

| Workstream                                             | Objective                                                                                                                    | Main outputs                                                                                                                                                        | Depends on                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Compatibility spec and product direction               | Define what "aligned with SWR" means, what remains intentionally Vue-native, and what is out of scope for v1 of the rewrite. | Compatibility matrix, API target list, decision notes for Vue-native divergences, release/versioning policy draft.                                                  | None                                                     |
| Monorepo foundation and workspace reshape              | Convert the starter scaffold into the intended repository shape and modern toolchain baseline.                               | `packages/swrv`, `packages/docs`, shared TS/Vite/Vitest config, scripts, package boundaries, clean workspace commands.                                              | Compatibility spec for package shape and release targets |
| Core runtime architecture                              | Build the provider-scoped cache/runtime domain that SWR-style APIs depend on.                                                | Cache/provider model, serialization, listener graph, dedupe, revalidation events, mutation coordination, preload support, SSR-safe boundaries.                      | Foundation                                               |
| Public API parity                                      | Recreate the SWR family of public entry points in Vue-native form.                                                           | `useSWRV`, config/provider API, global/bound `mutate`, `preload`, `immutable`, `infinite`, `mutation`, `subscription`, middleware/extensibility plan.               | Core runtime                                             |
| Type system redesign                                   | Make type inference and published declarations a first-class deliverable.                                                    | Strong key/fetcher inference, precise mutate and config types, conditional response types, exported helper types, type regression tests, package typing validation. | Compatibility spec, then each API module                 |
| Test platform and behavior harness                     | Replace legacy tests with modern, broad coverage that proves parity and Vue-specific correctness.                            | Vitest-based unit/integration harness, browser-level behavior tests, type tests, e2e smoke tests for docs/examples, parity test inventory.                          | Foundation first, then runtime/API work                  |
| Docs and examples                                      | Replace legacy docs with a modern site and examples that explain both usage and migration.                                   | VitePress site, getting-started docs, API reference, migration guide, parity notes, SSR guidance, examples that double as test fixtures.                            | API surface should be stable enough to document          |
| CI/CD, release engineering, and dependency maintenance | Make the project maintainable as an OSS library.                                                                             | GitHub Actions, Renovate, versioning flow, npm Trusted Publisher, provenance, changelog/release notes, branch/tag strategy.                                         | Foundation, package shape, release policy                |
| Agent memory and execution hygiene                     | Keep future agent work grounded and reduce context rebuild cost.                                                             | Up-to-date `journey/design.md`, dated phase plans, implementation logs, compatibility status notes.                                                                 | Continuous                                               |

## 2. Recommended Sequencing

The work should run in seven phases. The order matters because the rebuild is constrained more by shared runtime contracts than by UI or docs work.

### Phase 0: Alignment Baseline

Do first:

- Lock the behavioral reference to local SWR 2.4.1 source and tests.
- Decide the target support envelope:
  - Vue version floor
  - TypeScript version floor
  - browser plus SSR support expectations
  - breaking-change versioning policy
- Write the first compatibility matrix:
  - must match SWR
  - intentionally Vue-specific
  - intentionally deferred

Why first:

- Without this, the team can build the wrong API surface or preserve the wrong legacy features.
- The TTL and SSR questions affect the entire runtime design.

### Phase 1: Repository and Tooling Foundation

Do second:

- Replace the starter workspace shape with `packages/swrv` and `packages/docs`.
- Remove placeholder starter assets and packages.
- Establish the shared Vite+/TypeScript/Vitest baseline.
- Define lint, format, typecheck, build, and test entry points that match the final repo shape.
- Put in a minimal CI skeleton early so the repo never regresses into an unvalidated state.

Why now:

- Every later stream depends on the real package boundaries.
- It is cheaper to change build and test topology before source modules and docs accumulate.

### Phase 2: Runtime Core

Do third:

- Design the cache boundary and provider model.
- Implement key serialization, cache helpers, subscriptions/listeners, event-based revalidation, deduplication, race handling, and request coordination.
- Define SSR-safe lifecycle and hydration primitives.
- Establish global and scoped mutate semantics at the runtime level before exposing the full public API.

Why now:

- `mutation`, `infinite`, `subscription`, middleware, and SSR all depend on this layer.
- Porting or writing tests before the runtime contract stabilizes creates churn.

### Phase 3: Core API Surface

Do fourth:

- Implement `useSWRV`, config/provider APIs, global/bound mutate, preload, immutable semantics, and core config options.
- Lock the Vue-native return contract and reactive behavior.
- Capture any justified divergences from SWR with explicit docs and tests.

Why now:

- This is the smallest usable product slice.
- It unlocks docs, examples, and migration writing without yet needing every advanced API.

### Phase 4: Advanced APIs

Do fifth:

- Implement `useSWRVInfinite`, `useSWRVMutation`, and `useSWRVSubscription` or whatever final naming and export strategy is chosen.
- Add middleware and extension points.
- Finalize advanced mutation behavior such as optimistic writes, rollback, populate-cache, and revalidation controls.

Why after Phase 3:

- These APIs are thin only if the runtime and base hook behavior are already stable.
- Otherwise each advanced API will invent its own incompatible state model.

### Phase 5: Type and Test Hardening

Do sixth:

- Expand type tests until every public API edge is covered.
- Port or adapt SWR behavior tests by domain.
- Add browser/e2e coverage around focus, reconnect, polling, SSR hydration flows, and docs examples.
- Run package-shape validation on built output.

Why here:

- Hardening is most effective once the public surface is largely present.
- This phase converts "works in demos" into "safe to publish".

### Phase 6: Docs, CI/Release, and Launch Readiness

Do last:

- Finish the VitePress rewrite.
- Publish migration and release guidance.
- Add Renovate and modern release automation.
- Wire npm Trusted Publisher and GitHub Releases.
- Prepare prerelease and stable launch criteria.

Why last:

- Docs and release automation are most valuable when the exported surface, file layout, and build output are stable.
- Release engineering depends on final package names, outputs, and test gates.

## 3. Milestones

| Milestone                    | Objective                                                                         | Expected outcome                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1: Project charter locked   | Freeze the rebuild goals, support envelope, and compatibility principles.         | The repo has a current `journey/design.md`, a compatibility matrix, and a decision on the intended release line and support floor.                  |
| M2: Monorepo shape corrected | Convert the starter scaffold into the actual SWRV workspace.                      | `packages/swrv` and `packages/docs` exist, placeholder starter packages are gone, and the workspace builds/tests through Vite+ commands.            |
| M3: Runtime alpha            | Land the provider-scoped runtime model and the minimal cache/revalidation system. | There is a stable internal runtime contract with unit coverage for serialization, dedupe, listeners, and SSR-safe isolation.                        |
| M4: Core API alpha           | Deliver a usable base library aligned with SWR core behavior.                     | `useSWRV`, config/provider, mutate, preload, and immutable behavior are implemented and documented at a draft level.                                |
| M5: Advanced API beta        | Reach parity on the major SWR entry points beyond the base hook.                  | Infinite loading, mutation, subscription, and middleware/extensibility are implemented with behavior tests and type coverage.                       |
| M6: Publishability gate      | Prove the package is accurate, typed, and maintainable.                           | Behavior tests, type tests, e2e checks, package output validation, and CI gates are passing.                                                        |
| M7: OSS launch readiness     | Finish the repository as a modern open-source library project.                    | Docs are rewritten, migration guides are ready, Renovate and release automation are active, and a prerelease or release candidate can be published. |

## 4. Parallelization Opportunities

### Sequential Backbone

These areas should remain mostly sequential:

- Compatibility spec before runtime design
- Monorepo reshape before broad feature work
- Runtime core before advanced APIs
- API stabilization before final docs and release automation

These are the shared-contract layers. Parallelizing them too early creates rework and conflicting assumptions.

### Parallel Lanes After Foundation

Once Phase 1 is complete, these can run in parallel with clear ownership:

- Runtime implementation and behavior-test harness setup
- Docs site skeleton and information architecture
- CI skeleton, Renovate config, and repo health automation
- Research/writeups for migration guidance and compatibility notes

Once Phase 3 is complete, these can run in parallel:

- Advanced API modules by domain
- Type-test expansion by API domain
- Example apps and docs examples
- E2E scenarios that use the docs/examples as fixtures

### Good Delegation Targets For Subagents

These are the best candidates for delegation because they can be bounded to a domain and a disjoint write set:

- Compatibility research for one feature area at a time:
  - mutation semantics
  - infinite loading behavior
  - subscription lifecycle
  - SSR/provider behavior
- Test-porting work by domain:
  - focus and reconnect
  - cache and dedupe
  - mutation and optimistic updates
  - infinite and subscription
  - type tests
- Docs authoring by section:
  - getting started
  - migration guide
  - API reference drafts
  - SSR guidance
- Infrastructure work with isolated files:
  - `.github/workflows/*`
  - Renovate config
  - release scripts and versioning config
  - docs-site scaffolding

### Poor Delegation Targets

These should stay with the main agent or a tightly coordinated owner:

- Final runtime architecture decisions
- Public API naming and compatibility policy
- Cross-cutting cache/provider semantics
- Final integration of types with runtime behavior

## 5. Risks and Unknowns

The following should be validated early, not discovered late:

- Versioning risk: the rewrite is likely breaking. Decide early whether this is a new major line or a continuation with compatibility shims.
- Vue support floor: newer Vue APIs could simplify the implementation, but raising the floor changes adoption and migration expectations.
- SSR contract: "SSR-safe" must be defined concretely. Vue SSR, Nuxt, and SSG do not all require the same primitives.
- TTL strategy: legacy SWRV treats TTL and serverTTL as first-class. SWR does not. Keeping TTL in core may complicate parity and runtime design.
- Vue-native return contract: the library should feel like Vue, but every extra abstraction away from SWR makes migration and parity harder.
- Test translation risk: many SWR tests are React-oriented. They should be adapted by behavior, not blindly transliterated.
- Release mechanics risk: npm Trusted Publisher requires org and package setup outside code. Validate the GitHub and npm permissions path before the release phase.
- Scope risk: docs, examples, CI, and release work are easy to defer, but they are part of the stated project goal and should be milestone-tracked from the start.

## 6. High-Level Execution Plan

### Recommended End-to-End Roadmap

1. Establish the reference contract.
   - Create the compatibility matrix and record early decisions in `journey/design.md`.
   - Decide what is mandatory for first release parity and what is explicitly deferred.

2. Correct the repository shape.
   - Move to `packages/swrv` and `packages/docs`.
   - Remove starter scaffolding and make the workspace commands reflect the real project.

3. Build the runtime first, not the hook surface first.
   - Implement provider-scoped state, cache helpers, revalidation events, dedupe, and mutation coordination.
   - Design SSR isolation at the same time, not as a retrofit.

4. Deliver the smallest publishable core.
   - Land `useSWRV`, config/provider, mutate, preload, immutable behavior, and enough docs/examples/tests to let contributors use the package correctly.

5. Add the advanced parity layers.
   - Ship infinite loading, mutation, subscription, middleware/extensibility, and any compatibility utilities needed for migration from legacy SWRV.

6. Harden the public contract.
   - Expand unit, integration, browser, e2e, and type coverage until the major SWR behavior domains are represented.
   - Validate the built package and declaration output, not only source-level tests.

7. Finish the open-source product surface.
   - Rewrite docs in VitePress, publish migration guides, add dependency automation, and establish a repeatable release flow with Trusted Publisher and provenance.

### Recommended Operating Rules During Execution

- Treat SWR source and tests as the canonical reference unless a Vue-specific difference is intentionally documented.
- Require every milestone to update `journey/design.md` when decisions change.
- Keep a visible compatibility status document so parity progress is measurable instead of implicit.
- Make docs examples executable and testable so docs and validation reinforce each other.
- Keep infrastructure landing early enough that every later phase runs through CI and release-like packaging checks.

## 7. Suggested Phase Breakdown For Future Implementation Plans

When the project moves from planning to implementation, the next layer of plans should likely be split into separate dated documents for:

- Phase 1 foundation and workspace migration
- Runtime architecture and compatibility matrix
- Core API implementation
- Advanced APIs
- Type and test hardening
- Docs and launch readiness

That keeps the end-to-end roadmap stable while letting implementation plans stay small enough for agent execution.
