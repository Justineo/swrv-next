# Repository Analysis Refresh

Date: 2026-03-22
Status: completed

## Scope and method

This report treats `journey/design.md` as intended-design context and the code
under `packages/` as ground truth.

Inputs reviewed:

- repository memory and package metadata
- `packages/swrv/src`
- representative tests in `packages/swrv/tests`
- browser fixture coverage in `packages/swrv/e2e`
- docs-site structure in `packages/site`
- local SWR reference under `/Users/yiling.gu@konghq.com/Developer/Justineo/swr`

Validation run during the audit:

- `vp install`
- `vp run swrv#test` -> passed (`24` files, `221` tests)
- `vp exec playwright test` -> passed (`4` e2e tests)
- `vp run swrv#check -- --no-fmt` -> passed
- `vp run swrv#check` -> failed because formatter scanned local ignored `packages/swrv/dist/` outputs
- `vp run swrv#check -- src tests e2e vite.config.ts package.json` -> passed

## System overview

### Design view

The repo is trying to rebuild SWRV as a Vue-native counterpart to SWR 2.4.1:

- provider-scoped runtime instead of module singletons
- SWR-shaped public API and feature entry points
- Vue refs, watchers, and provide/inject instead of React hooks internals
- explicit SSR snapshot and fallback handoff instead of React-only server paths

### Code view

The implementation matches that direction closely:

- root monorepo split is clean:
  - `packages/swrv`: published runtime
  - `packages/site`: docs site
- public runtime entrypoints are thin:
  - root exports in `packages/swrv/src/index.ts`
  - feature entrypoints in `immutable`, `infinite`, `mutation`, `subscription`
- provider-scoped state is real, not just documented:
  - `config-context.ts` creates or reuses `SWRVClient`
  - `_internal/client.ts` delegates to provider-state and cache helpers
  - hooks interact through per-client listeners, revalidators, fetch lanes, and preload state

The meaningful engineering surface is overwhelmingly in `packages/swrv`. The
docs site is isolated and structurally simple.

## Inferred design intent

From the code, the effective design intent is:

1. Keep SWR compatibility at the behavior level, not by porting React internals literally.
2. Concentrate complexity in the base hook runtime, then keep advanced APIs as thin wrappers where practical.
3. Make cache and event scope explicit through `SWRVClient` so SSR request isolation and nested providers are first-class.
4. Prefer explicit helpers and tests over clever implicit behavior.
5. Accept some type complexity and wrapper indirection when that is the cost of SWR-shaped API parity.

## Architecture analysis

### Overall assessment

The architecture is broadly sound. The current codebase is much closer to SWR's
shape than to legacy SWRV, and most of the remaining complexity is justified by
that target rather than by local over-engineering.

The strongest architectural choices are:

- provider-scoped client state instead of hidden globals
- a thin public root plus feature subpath structure
- small focused internal helpers for cache I/O, provider state, serialization,
  and preload
- extensive behavioral, type, e2e, and packaging coverage

### Comparison with SWR

The main runtime sizes are close to the local SWR reference:

- SWRV `packages/swrv/src/index/use-swrv-handler.ts`: `656` lines
- SWR `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts`: `860` lines
- SWRV `packages/swrv/src/infinite/index.ts`: `333` lines
- SWR `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/index.ts`: `355` lines
- SWRV `packages/swrv/src/mutation/index.ts`: `173` lines
- SWR `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/index.ts`: `175` lines
- SWRV `packages/swrv/src/subscription/index.ts`: `125` lines
- SWR `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/subscription/index.ts`: `134` lines

Conclusion:

- a large base hook is acceptable here
- infinite, mutation, and subscription complexity are reference-like
- broad rewrites to "simplify" these areas would likely remove structure that
  SWR itself also needs

### Design vs implementation consistency

Consistency is high.

What the design says and the code confirms:

- provider-scoped runtime exists in code, not just docs
- advanced APIs mostly build on the base hook rather than re-implementing the
  full runtime
- SSR is explicit and snapshot-based
- the library is validated through layered tests, not only unit tests

The main mismatch is not architectural but operational:

- the recommended `vp check` workflow is fragile when ignored build artifacts
  exist locally, because formatter scope is broader than the source tree

## Key findings by module

### 1. Runtime foundation: strong boundary design, but `SWRVConfig` semantics remain subtle

Relevant files:

- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/config-utils.ts`
- `packages/swrv/src/_internal/client.ts`
- `packages/swrv/src/_internal/provider-state.ts`
- `packages/swrv/src/_internal/cache-helper.ts`

What is valuable:

- `SWRVConfig` cleanly separates cache boundary creation from runtime use.
- `SWRVClient` is already a thin facade over smaller helpers.
- provider event setup, listener registries, fetch records, mutation markers,
  and preload state are all scoped by client.

What is risky:

- boundary decisions are one-time, while request behavior stays reactive.
- that split is correct, but it is easy to misunderstand.

This subtlety is visible in the code:

- `config-context.ts` decides boundary ownership once from `initialValue`, then
  keeps later request-time behavior reactive through `resolvedConfig`
- `config-utils.ts` explicitly treats `client`, `cache`, `provider`,
  `initFocus`, and `initReconnect` as boundary-time inputs

Assessment:

- keep the architecture
- do not refactor this into a different ownership model
- improve contributor-facing clarity around which config changes are live and
  which require a new boundary

### 2. Base hook runtime: the real hotspot, but mostly justified

Relevant file:

- `packages/swrv/src/index/use-swrv-handler.ts`

What is valuable:

- it centralizes the actual runtime state machine in one place
- polling, retry, dedupe, mutation races, fallback handling, and cache sync all
  meet there
- the hook uses the active cache-listener payload directly instead of blindly
  rereading cache on every update

What is risky:

- one file owns too many concerns:
  - cache synchronization
  - loading and refresh timers
  - request lifecycle
  - retry scheduling
  - focus and reconnect behavior
  - key activation and cleanup
  - SSR warning behavior
- this raises the cost of future edits because changes to one behavior can
  interact with several others

Assessment:

- this is the main maintainability hotspot
- it is still acceptable complexity for this kind of library
- refactor only in service of concrete future changes, not for line-count
  reduction

### 3. Infinite API: good shape, but coupled through internal cache-key conventions

Relevant files:

- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/infinite/serialize.ts`
- `packages/swrv/src/infinite/state.ts`
- `packages/swrv/src/_internal/key-prefix.ts`
- `packages/swrv/src/_internal/mutate.ts`

What is valuable:

- it stays mostly feature-local
- size state and revalidation state are scoped per cache boundary
- it reuses the base hook for aggregate state while keeping page logic local

What is risky:

- the feature depends on hidden shared conventions:
  - aggregate cache keys use `$inf$`
  - global mutate must know to skip those keys
- this is manageable today, but it is cross-module coupling

Assessment:

- the orchestration itself is justified and close to SWR
- the coupling through hard-coded prefix knowledge is the part worth improving

### 4. Mutation API: one of the cleanest modules in the repo

Relevant files:

- `packages/swrv/src/mutation/index.ts`
- `packages/swrv/src/_internal/mutate.ts`

What is valuable:

- feature-local state is small and understandable
- the module delegates cache semantics to shared mutate logic instead of
  growing its own mutation engine
- compared with SWR, the Vue version is slightly simpler because it can lean on
  closure semantics and refs instead of more React-specific state plumbing

Assessment:

- no major design issue here
- keep this as a model for future feature additions

### 5. Subscription API: concise and correctly scoped

Relevant files:

- `packages/swrv/src/subscription/index.ts`
- `packages/swrv/src/subscription/state.ts`

What is valuable:

- subscription ref-counting is cache-boundary scoped
- it reuses the base hook for state exposure instead of creating parallel state
  semantics
- it avoids resubscription when only reactive invalidation changes but the
  serialized key stays the same

What is risky:

- like infinite, it relies on internal prefixed cache keys and global mutate
  having matching internal-key knowledge

Assessment:

- the module is well-sized
- the main risk is shared internal-key coupling, not the module itself

### 6. Type surface: large, but mostly compatibility-driven rather than accidental

Relevant files:

- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/index/use-swrv.ts`
- `packages/swrv/src/mutation/types.ts`
- `packages/swrv/src/infinite/types.ts`
- `packages/swrv/tests/swrv.types.ts`

What is valuable:

- the library takes the public type contract seriously
- type tests are broad enough to catch API drift

What is risky:

- the public overload surface is expensive to maintain
- understanding the real callable surface requires reading both the type files
  and the type tests

Assessment:

- not a good target for aggressive simplification before release
- still worth treating as a contributor-cost center

### 7. Repo and docs wiring: clean split, one practical tooling flaw

Relevant files:

- `README.md`
- `packages/swrv/package.json`
- `vite.config.ts`
- `playwright.config.ts`
- `packages/site/docs/.vitepress/config.ts`

What is valuable:

- repo-level commands are coherent
- package, docs, test, and release boundaries are clear
- the docs package is isolated from the runtime package
- browser fixture coverage is kept close to the library package instead of
  mixed into docs

What is risky:

- `packages/swrv/package.json` publishes only `dist`, while `vp check` is
  configured broadly enough that local ignored `dist/` outputs can poison the
  normal validation path

Assessment:

- this is a real contributor ergonomics issue
- it is the clearest quick win found in this audit

## Redundancies and simplification opportunities

### Redundancies that are real

1. Argument normalization and middleware entry logic are split across two small
   helpers:
   - `packages/swrv/src/_internal/resolve-args.ts`
   - `packages/swrv/src/_internal/with-middleware.ts`
     Both normalize arguments and reconstruct hook calls. This is minor
     duplication, not a design flaw.

2. Internal cache-key knowledge is duplicated:
   - prefixes are defined in `_internal/constants.ts`
   - infinite and subscription construct prefixed keys locally
   - mutate has to know which prefixes are internal via `_internal/key-prefix.ts`

### Redundancies that are acceptable

- thin barrels and tiny files such as `config.ts`, `index/serialize.ts`, or
  `_internal/cache.ts` are not meaningful duplication problems
- they are boundary files and match the desired package shape

### Dead code

I did not find meaningful dead runtime paths in the current source.

Notable point:

- previously suspicious vestigial concepts from earlier audits are already gone
- current tiny helper modules are used and reflect intentional boundaries, not
  abandoned code

## Maintainability issues

### P1. Validation workflow is too sensitive to local build artifacts

Impact:

- `vp run swrv#check` can fail even when source, tests, lint, and types are
  clean, because ignored generated `dist/` files are still scanned by the
  formatter

Why it matters:

- it creates false-negative local validation
- it makes the recommended workflow less trustworthy

### P2. Internal feature coordination still depends on implicit key-prefix conventions

Impact:

- `infinite`, `subscription`, and global mutate are coupled through internal
  prefixed cache-key contracts

Why it matters:

- future internal resource types will require touching multiple modules
- the coupling is hidden unless the reader inspects all of those modules

### P2. `SWRVConfig` semantics are still easy to misread

Impact:

- contributors can reasonably assume all provider config is reactive, which is
  not true

Why it matters:

- boundary bugs are hard to reason about
- nested provider behavior is a core part of this design

### P3. The base hook remains a concentrated change-risk zone

Impact:

- future feature work will likely keep landing in the same file

Why it matters:

- correctness depends on keeping several interacting timers and lifecycle paths
  aligned
- tests reduce the risk, but they do not make the file easy to change

## Refactoring recommendations with priorities

### P1

1. Make `vp check` ignore generated outputs or scope it to source inputs.
   Options:
   - configure formatter ignore rules for `packages/swrv/dist`
   - change the package check script to pass explicit source paths
   - ensure build outputs are cleaned before format checks

### P2

1. Centralize internal cache-key registration.
   A small internal registry or shared key-builder module would remove the
   current prefix knowledge split across `infinite`, `subscription`, and mutate.

2. Add maintainer-facing documentation for `SWRVConfig` boundary semantics.
   The code comments in `config-context.ts` are helpful, but this deserves an
   explicit note in contributor docs or a source-level module comment.

3. Collapse the small duplicate argument or middleware entry helpers if it can
   be done without harming readability.
   This is low-risk cleanup, not a strategic refactor.

### P3

1. If the next feature or bugfix again expands `use-swrv-handler.ts`, extract a
   narrowly-scoped lifecycle helper:
   - request execution and stale-result guards
   - timer scheduling
   - activation and subscription wiring

   Do this only when it helps a concrete change. Do not rewrite the file just
   because it is large.

2. If test growth continues, split the largest domain files with shared
   scenario helpers:
   - `core-infinite.test.ts`
   - `core-config-revalidate.test.ts`
   - `core-cache-provider.test.ts`

   This is mainly for contributor ergonomics.

## Quick wins

- Fix formatter scope so ignored `dist/` output does not break `vp check`.
- Document `SWRVConfig` one-time boundary inputs versus reactive request-time
  options.
- Replace scattered internal-prefix knowledge with one shared internal-key
  utility.

## Long-term improvements

- Preserve the current architecture, but isolate future complexity added to the
  base hook into smaller lifecycle helpers when real change pressure appears.
- Keep using SWR as the comparison bar before attempting any major
  simplification. Most of the current complexity is already reference-aligned.
- Treat the large public type surface as a stability cost center and avoid
  speculative rewrites unless they solve real typing bugs or release friction.

## File-level evidence

- `packages/swrv/src/config-context.ts:72-111`
  Boundary ownership is decided once, while later config reads stay reactive.
- `packages/swrv/src/config-utils.ts:28-67`
  `client`, `cache`, `provider`, `initFocus`, and `initReconnect` are boundary
  inputs, not fully reactive options.
- `packages/swrv/src/_internal/client.ts:34-109`
  `SWRVClient` is already a thin facade over provider-state and cache-helper.
- `packages/swrv/src/_internal/provider-state.ts:31-40`
  Provider-scoped runtime state is explicit and compact.
- `packages/swrv/src/_internal/provider-state.ts:100-135`
  Fetch dedupe and expiry are centralized per client.
- `packages/swrv/src/index/use-swrv-handler.ts:126-151`
  Timer ownership is local to the base hook and interacts with several runtime
  paths.
- `packages/swrv/src/index/use-swrv-handler.ts:250-455`
  Request execution, race suppression, retries, success and error callbacks,
  and pause handling all live in one lifecycle block.
- `packages/swrv/src/index/use-swrv-handler.ts:503-626`
  Key activation, subscription setup, server behavior, and mount revalidation
  are coupled in one watcher.
- `packages/swrv/src/infinite/index.ts:24-173`
  Infinite loading is feature-local and reference-like in shape.
- `packages/swrv/src/infinite/index.ts:175-255`
  Infinite mutate and size growth logic remain concise but still own extra
  aggregate semantics.
- `packages/swrv/src/infinite/serialize.ts:7-35`
  Infinite cache keys are built from an internal prefix convention.
- `packages/swrv/src/subscription/index.ts:17-19`
  Subscription cache keys are built from another internal prefix convention.
- `packages/swrv/src/_internal/key-prefix.ts:3-7`
  Global mutate needs explicit prefix knowledge to avoid leaking internal keys.
- `packages/swrv/src/_internal/mutate.ts:33-49`
  Filter-based mutate skips internal cache keys through that prefix utility.
- `packages/swrv/src/_internal/resolve-args.ts:21-40`
  Base hook entry normalization and middleware application are handled here.
- `packages/swrv/src/_internal/with-middleware.ts:32-56`
  Feature wrappers re-normalize arguments and append middleware entries here.
- `packages/swrv/src/mutation/index.ts:17-107`
  Mutation is comparatively small and well-factored.
- `packages/swrv/src/subscription/index.ts:21-107`
  Subscription is concise and correctly cache-scoped.
- `packages/swrv/src/_internal/types.ts:90-199`
  Configuration and resolved-configuration types are rich and central.
- `packages/swrv/src/index/use-swrv.ts:21-128`
  Public overload complexity is substantial and intentional.
- `packages/swrv/tests/swrv.types.ts`
  Type compatibility is heavily exercised and clearly treated as part of the
  supported surface.
- `packages/swrv/tests/core-infinite.test.ts`
  Infinite behavior breadth explains why the feature wrapper remains non-trivial.
- `packages/swrv/tests/core-config-revalidate.test.ts`
  Revalidation semantics are broad and runtime-sensitive.
- `packages/swrv/tests/core-cache-provider.test.ts`
  Provider scoping is a major supported behavior surface, not an internal detail.
- `packages/swrv/package.json:60-65`
  The package check command is broad and does not constrain inputs.
- `.gitignore:10-17`
  `dist` is ignored by Git, but that does not currently protect local check
  runs from scanning build output.

## Bottom line

The repository is in good shape.

The valuable parts are real and should remain:

- provider-scoped runtime state
- explicit SSR helpers
- thin advanced feature wrappers
- broad behavioral and packaging coverage

The codebase does not currently show major over-engineering relative to SWR.
The worthwhile work is narrower:

1. fix the validation ergonomics around generated `dist/`
2. clarify `SWRVConfig` semantics for maintainers
3. reduce hidden internal-key coupling
4. keep future changes to the base hook disciplined and incremental
