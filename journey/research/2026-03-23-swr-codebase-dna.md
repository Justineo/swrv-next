# Codebase DNA Report for SWR

## A. Executive summary

This repository is not a true multi-package monorepo in practice. It is a single TypeScript library with one real source tree in `src/`, plus thin root-level package shims (`infinite/`, `immutable/`, `mutation/`, `subscription/`, `_internal/`) that only exist to publish subpath exports. The architectural center of gravity is `src/index/use-swr.ts`, with `src/_internal/` acting as a small functional kernel and each public feature module layering on top of that kernel through wrappers or middleware instead of separate subsystems.

The engineering style is aggressively pragmatic. Runtime code favors plain functions, closures, refs, `WeakMap`/`Map`, and local helper functions over classes, enums, or elaborate abstractions. Public types are much more formal than runtime internals: the repo spends significant complexity budget on overloads, conditional types, and type-test coverage, while still allowing `any` internally when that keeps the runtime simpler. The maintainers care a lot about compatibility, deduplication, race handling, and render behavior across React 17, React 19, suspense, SSR, and react-server entrypoints.

The dominant code-writing instinct is "keep the abstraction small and local until reuse is undeniable." Most source files are tiny, single-purpose utilities. The few large files are reserved for orchestration-heavy logic or overload-heavy type surfaces. Comments are used to explain invariants, performance tradeoffs, compatibility hacks, and bug-history context. Tests are the strongest expression of repository values: they are broad, behavior-first, and cover public API details, type inference, and cross-environment edge cases more thoroughly than the README or config files do.

## B. High-confidence conventions

### 1. One real core, many thin public entrypoints

- Convention: The repo treats `src/` as the real codebase and root package folders as packaging shims.
- What it means in practice: New implementation code belongs under `src/`, not in the root `infinite/`, `mutation/`, `subscription/`, `immutable/`, or `_internal/` folders. Those root folders only contain `package.json` files pointing at `dist`.
- Why it appears preferred here: All runtime logic lives in `src/index`, `src/_internal`, and `src/{infinite,immutable,mutation,subscription}`; the root package folders contain no implementation.
- Evidence: `package.json` exports map to `dist/*`; `find src -maxdepth 3 -type f`; `_internal/package.json`; `infinite/package.json`; `mutation/package.json`; `subscription/package.json`; `immutable/package.json`.
- Confidence: High

### 2. Public feature modules are wrappers over the core, not separate systems

- Convention: New public APIs should usually extend `useSWR` through middleware or narrow wrappers instead of reimplementing the cache/fetch lifecycle.
- What it means in practice: Keep shared lifecycle behavior in `useSWR` + `_internal` helpers, then layer feature-specific behavior on top. `immutable` uses middleware directly, `mutation` and `subscription` use `withMiddleware`, and `infinite` wraps `useSWR` while still reusing serialization, cache helpers, and global state.
- Why it appears preferred here: Every public feature entrypoint reaches back into the same internal primitives instead of building its own store or request engine.
- Evidence: `src/immutable/index.ts:5-16`; `src/mutation/index.ts:23-165`; `src/subscription/index.ts:28-127`; `src/infinite/index.ts:44-355`; `src/_internal/utils/with-middleware.ts:12-27`.
- Confidence: High

### 3. Prefer small, single-purpose utility files

- Convention: Most helpers live in tiny focused files; large files are exceptions reserved for orchestration or types.
- What it means in practice: Extract cross-cutting primitives like `serialize`, `mergeConfigs`, `subscribeCallback`, `useSWRConfig`, and `web-preset` into dedicated files. Do not create broad "utils" files for unrelated logic.
- Why it appears preferred here: The source tree is dominated by very small files. A quick size pass shows 25 source files under 50 lines, 11 between 50 and 199 lines, and only 5 at 200+ lines.
- Evidence: `wc -l` across `src`; `src/_internal/utils/merge-config.ts`; `src/_internal/utils/serialize.ts`; `src/_internal/utils/subscribe-key.ts`; `src/_internal/utils/use-swr-config.ts`; `src/_internal/utils/web-preset.ts`.
- Confidence: High

### 4. Big files are acceptable when they are the natural home of orchestration

- Convention: The repo does not force artificial file splitting for complex lifecycle code or overload-heavy type surfaces.
- What it means in practice: Keep the full `useSWR` lifecycle in one place and keep public type overloads together even when those files get large.
- Why it appears preferred here: `src/index/use-swr.ts` is 860 lines and `src/_internal/types.ts` is 1132 lines, yet both are still the central source of truth instead of being fragmented.
- Evidence: `src/index/use-swr.ts`; `src/_internal/types.ts`; `wc -l` results.
- Confidence: High

### 5. Runtime code is functional and stateful, but not object-oriented

- Convention: Use closures, refs, tuples, plain objects, `WeakMap`, and `Map`; avoid classes and enums.
- What it means in practice: Model internal state as tuples or plain object records, store cross-instance state in `WeakMap`, and compose behavior with functions. Do not introduce class hierarchies or `enum`s for this codebase.
- Why it appears preferred here: There are no real classes or enums in `src/`; cross-hook state uses `WeakMap` and plain records.
- Evidence: `src/_internal/utils/global-state.ts:1-4`; `src/_internal/utils/cache.ts:44-82`; `src/_internal/utils/hash.ts:7-76`; `src/subscription/index.ts:22-24`; `rg -n "\benum\b|\bclass\b" src test`.
- Confidence: High

### 6. Optimize rerender behavior with stable refs and getter-based responses

- Convention: Avoid unnecessary rerenders even if the implementation becomes more intricate.
- What it means in practice: Track dependencies manually, store mutable values in refs, and return objects with getters so consumers only subscribe to accessed fields.
- Why it appears preferred here: The core hook, infinite wrapper, and mutation wrapper all use getter-based return objects, ref synchronization, and explicit equality logic.
- Evidence: `src/index/use-swr.ts:174-203`; `src/index/use-swr.ts:242-270`; `src/index/use-swr.ts:812-830`; `src/infinite/index.ts:321-339`; `src/mutation/index.ts:125-140`; `src/mutation/state.ts:27-90`; `e2e/test/initial-render.test.ts:45-63`.
- Confidence: High

### 7. Type precision matters most at the public API boundary

- Convention: Public types are highly engineered; runtime internals stay comparatively loose.
- What it means in practice: Add overloads and conditional types when they materially improve consumer inference. Inside runtime code, `any` and pragmatic casts are accepted when needed for compatibility or ergonomics.
- Why it appears preferred here: `SWRHook`, `SWRResponse`, `Mutator`, `SWRMutationHook`, and `SWRInfiniteHook` are all overload-heavy; runtime code still uses `any`, `unknown as`, and local casts regularly.
- Evidence: `src/_internal/types.ts:393-707`; `src/_internal/types.ts:813-1045`; `src/mutation/types.ts:21-260`; `src/infinite/types.ts:14-145`; `src/index/use-swr.ts:122-126`; `src/_internal/utils/mutate.ts:48`; `src/mutation/index.ts:141-163`.
- Confidence: High

### 8. Source imports stay relative; public-package imports are validated in tests

- Convention: Internal code imports via relative paths, while tests intentionally import `swr` subpaths to validate the public API surface.
- What it means in practice: Do not add alias-heavy internal import conventions inside `src/`. If you need to test the public contract, import from `swr`, `swr/infinite`, `swr/mutation`, and `swr/_internal`.
- Why it appears preferred here: `src/` uses relative paths almost exclusively; tests use package names plus Jest moduleNameMapper.
- Evidence: `src/index/use-swr.ts`; `src/infinite/index.ts`; `src/mutation/index.ts`; `src/subscription/index.ts`; `jest.config.js:6-15`; `test/use-swr-middlewares.test.tsx:3-5`; `test/use-swr-remote-mutation.test.tsx:3-4`.
- Confidence: High

### 9. `import type` is the standard when a binding is type-only

- Convention: Type-only imports are separated with `import type`.
- What it means in practice: Preserve value/type separation and keep type imports explicit instead of relying on elision.
- Why it appears preferred here: The repo enabled `@typescript-eslint/consistent-type-imports`, and the pattern is used broadly across source and tests.
- Evidence: `eslint.config.mjs:80-85`; `src/index/use-swr.ts:28-40`; `src/_internal/utils/config.ts:1-8`; `src/infinite/types.ts:1-10`; `src/mutation/state.ts:1`; `rg -n "import type" src test e2e/site`.
- Confidence: High

### 10. Comments explain invariants and compatibility hacks, not obvious mechanics

- Convention: Commentary is dense around tricky control flow, render behavior, and bug-history, but sparse in simple helpers.
- What it means in practice: Add comments when a line exists because of React semantics, SSR behavior, dedupe/race handling, or TypeScript limitations. Do not narrate obvious code.
- Why it appears preferred here: The big lifecycle files are heavily annotated; tiny utilities are mostly self-explanatory.
- Evidence: `src/index/use-swr.ts:145-177`; `src/index/use-swr.ts:388-621`; `src/_internal/utils/cache.ts:33-43`; `src/mutation/state.ts:27-54`; `src/_internal/utils/shared.ts:5-9`; `git log --since='2025-01-01'` shows a recent docs-focused commit (`eff8fda`).
- Confidence: High

### 11. Tests are the primary specification for intended behavior

- Convention: Behavior, compatibility, and typing guarantees are encoded in tests more comprehensively than in README prose.
- What it means in practice: When adding or changing behavior, update Jest, type tests, and e2e coverage where relevant. Expect edge cases and regression scenarios to matter.
- Why it appears preferred here: The `test/` tree is large, broad, and behavior-specific; there are dedicated type tests and Playwright coverage for SSR/suspense paths.
- Evidence: `find test -maxdepth 3 -type f`; `test/use-swr-middlewares.test.tsx`; `test/use-swr-local-mutation.test.tsx`; `test/type/config.tsx`; `test/type/subscription.ts`; `e2e/test/initial-render.test.ts`; CI in `.github/workflows/test-release.yml`.
- Confidence: High

### 12. Compatibility work is a first-class concern

- Convention: New code should preserve behavior across React legacy/current/canary, SSR, browser, edge-like runtime, and react-server entrypoints.
- What it means in practice: Prefer compatibility shims over modern-only assumptions. Be careful with `useLayoutEffect`, `React.use`, `startTransition`, suspense-on-server behavior, and browser globals.
- Why it appears preferred here: The repo ships separate `react-server` exports, has React 17 and canary CI jobs, and maintains compatibility helpers in runtime code.
- Evidence: `package.json` exports; `src/index/index.react-server.ts`; `src/_internal/index.react-server.ts`; `src/infinite/index.react-server.ts`; `src/_internal/utils/env.ts:4-38`; `src/mutation/state.ts:5-10`; `.github/workflows/test-legacy-react.yml`; `.github/workflows/test-canary.yml`; `test/use-swr-legacy-react.test.tsx`; `test/use-swr-server.test.tsx`.
- Confidence: High

## C. Detailed convention map

### 1. Repository structure

- Dominant pattern: A hybrid package layout where implementation is centralized in `src/` and root-level package folders only provide publishable subpath wrappers.
- Secondary pattern or exceptions: `examples/` and `e2e/site/` are separate consumer apps used for docs and integration coverage, not shared runtime layers. `_internal` is a private-but-exported escape hatch.
- Evidence: Top-level tree; `package.json` exports; root `*/package.json` wrappers; `e2e/site/package.json`.
- Practical rule for future code generation: Put library implementation in `src/`; only touch root package folders when changing packaging/export metadata.

### 2. File organization

- Dominant pattern: One concept per file for helpers, one feature per file for public entrypoints, and one major concern per large file for orchestration/types.
- Secondary pattern or exceptions: Public type files are allowed to become large because overloads and documentation are intentionally centralized.
- Evidence: `src/_internal/utils/*.ts`; `src/index/use-swr.ts`; `src/_internal/types.ts`; source size distribution from `wc -l`.
- Practical rule for future code generation: Default to a small focused file. Keep code in the existing file if it is part of the same lifecycle or public type surface.

### 3. Naming

- Dominant pattern: Hooks and wrappers use `use*`; boolean and condition variables use `is*`, `has*`, or `should*`; refs end with `Ref`; internal metadata keys use short underscore-prefixed names.
- Secondary pattern or exceptions: Some public types use verbose `SWR*` prefixes, while local helpers inside a function are terse (`_`, `sub`, `next`, `opts`) when the surrounding scope is already precise.
- Evidence: `src/index/use-swr.ts` names like `isInitialMount`, `hasKeyButNoData`, `shouldDoInitialRevalidation`, `fetcherRef`; `src/infinite/index.ts` names like `revalidateFirstPage`, `resolvePageSize`, `_l`, `_i`, `_r`; `src/mutation/index.ts` names like `ditchMutationsUntilRef`.
- Practical rule for future code generation: Use descriptive lifecycle names at module scope and in public APIs; reserve short names for tiny local closures or cache metadata.

### 4. Ownership and module boundaries

- Dominant pattern: `_internal/utils` owns cross-cutting primitives; feature folders own their own special behavior and special types; the main hook owns the fetch/cache/render lifecycle.
- Secondary pattern or exceptions: Some duplication is tolerated across feature type files rather than forcing premature cross-feature abstractions.
- Evidence: `src/_internal/utils/cache.ts`; `src/_internal/utils/serialize.ts`; `src/infinite/types.ts:12`; `src/mutation/types.ts:3`; `src/subscription/index.ts`; `src/index/use-swr.ts`.
- Practical rule for future code generation: Extract to `_internal/utils` only when the primitive is truly shared across multiple entrypoints. Otherwise keep logic and types in the feature folder.

### 5. Logic placement

- Dominant pattern: Data lifecycle logic lives in hooks and internal utilities, not in components. Serialization, cache access, dedupe, and mutation orchestration each have specific homes.
- Secondary pattern or exceptions: Entrypoint files occasionally include small packaging shims (`config.ts`, `serialize.ts`) to support exports.
- Evidence: `src/index/use-swr.ts`; `src/_internal/utils/mutate.ts`; `src/_internal/utils/cache.ts`; `src/_internal/utils/preload.ts`; `src/index/serialize.ts`; `src/infinite/serialize.ts`.
- Practical rule for future code generation: Put pure transformation or cache primitives in `_internal/utils`; keep React orchestration in the hook/wrapper file; keep export-only shims tiny.

### 6. Type system style

- Dominant pattern: Use interfaces for object-shaped public contracts and overload-bearing call signatures; use type aliases for unions, conditional types, mapped types, and internal composition.
- Secondary pattern or exceptions: Runtime-facing object shapes sometimes use `type` instead of `interface` when they compose other types (`State`, `MutatorOptions`, `SWRConfiguration`).
- Evidence: `src/_internal/types.ts` interfaces `PublicConfiguration`, `SWRHook`, `SWRResponse`, `Cache`; type aliases `Key`, `Arguments`, `State`, `MutatorOptions`; `src/infinite/types.ts`; `src/mutation/types.ts`.
- Practical rule for future code generation: Match the existing split. If you are defining overloads or a public object contract, prefer `interface`. If you are building a union or conditional type, prefer `type`.

### 7. Data modeling

- Dominant pattern: Internal state uses plain objects with optional fields plus a few underscore-prefixed metadata fields. Global shared state often uses tuples or index-based arrays for compactness.
- Secondary pattern or exceptions: Public API objects are friendlier and getter-based; internal caches may store intentionally cryptic keys like `_k`, `_c`, `_l`, `_i`, `_r`.
- Evidence: `src/_internal/types.ts:12-27`; `src/_internal/types.ts:913-922`; `src/infinite/types.ts:147-157`; `src/_internal/utils/cache.ts:74-82`; `src/_internal/utils/helper.ts:18-53`.
- Practical rule for future code generation: Use small plain-object or tuple models internally. Only introduce richer domain-model objects if the API actually exposes them.

### 8. Control flow and error handling

- Dominant pattern: Guard clauses first, then local closures, then a single `try/catch` around async work. Expected fetch errors become state and callbacks, not thrown exceptions.
- Secondary pattern or exceptions: The code does throw for programmer misuse and unsupported runtime situations.
- Evidence: `src/index/use-swr.ts:361-377`; `src/index/use-swr.ts:390-609`; `src/_internal/utils/mutate.ts:63-217`; `src/subscription/index.ts:74-79`; `src/mutation/index.ts:52-57`; `src/index/use-swr.ts:781`.
- Practical rule for future code generation: Throw only for invariant violations or impossible-supported-environment cases. For ordinary request failures, update state and invoke callbacks.

### 9. State and effects

- Dominant pattern: Mutable lifecycle values live in refs; shared subscription state is keyed by cache/provider; browser side effects are isolated behind `useIsomorphicLayoutEffect` and preset helpers.
- Secondary pattern or exceptions: `useMemo` and `useCallback` are used strategically for subscription stability and snapshot identity, not pervasively for everything.
- Evidence: `src/index/use-swr.ts:151-174`; `src/index/use-swr.ts:205-276`; `src/index/use-swr.ts:637-767`; `src/_internal/utils/env.ts`; `src/_internal/utils/web-preset.ts`; `src/subscription/index.ts:24-25`.
- Practical rule for future code generation: If state should not trigger rerenders directly, store it in a ref. If side effects depend on runtime environment, route them through env/preset helpers.

### 10. Dependency and import style

- Dominant pattern: External imports first, internal relative imports next, and type-only imports separated with `import type`.
- Secondary pattern or exceptions: Exact ordering of value imports is not rigid across every file, but relative imports dominate inside `src/`.
- Evidence: `src/index/use-swr.ts`; `src/infinite/index.ts`; `src/_internal/utils/config-context.ts`; lint rule in `eslint.config.mjs`.
- Practical rule for future code generation: Use relative imports inside library code. Keep type imports explicit. Avoid introducing new alias schemes in `src/`.

### 11. Reuse and abstraction heuristics

- Dominant pattern: Reuse low-level primitives, not broad frameworks. The repo prefers a small number of durable helpers plus feature-specific orchestration.
- Secondary pattern or exceptions: Feature folders sometimes redefine simple helper types locally when that keeps the feature self-contained.
- Evidence: Reused primitives `serialize`, `createCacheHelper`, `withMiddleware`, `mergeConfigs`, `useIsomorphicLayoutEffect`; local feature types in `src/infinite/types.ts` and `src/mutation/types.ts`.
- Practical rule for future code generation: Share primitives, not policy. Extract the smallest reusable piece and leave behavior-specific orchestration close to the feature.

### 12. Framework idioms

- Dominant pattern: React is used in a low-level library style, not an app style. Hooks are built around `useSyncExternalStore`, refs, and environment shims rather than component state alone.
- Secondary pattern or exceptions: Test files and e2e fixtures use tiny inline components to exercise behavior, but those are test harnesses, not architectural examples for the runtime.
- Evidence: `src/index/use-swr.ts`; `src/infinite/index.ts`; `src/mutation/state.ts`; `e2e/site/app/render-count/page.tsx`; `test/use-swr-config.test.tsx`.
- Practical rule for future code generation: Write React code as hook infrastructure. Optimize subscription behavior and compatibility first; keep UI concerns out of runtime modules.

### 13. API and boundary design

- Dominant pattern: Public hooks use positional arguments normalized internally, while configuration and mutation customization use option objects.
- Secondary pattern or exceptions: Historical ergonomics are preserved, so booleans are still accepted in some places where a newer design might force options objects.
- Evidence: `src/_internal/utils/normalize-args.ts`; `src/_internal/utils/mutate.ts:51-56`; `src/infinite/index.ts:239-247`; overloads in `src/_internal/types.ts`, `src/mutation/types.ts`, `src/infinite/types.ts`.
- Practical rule for future code generation: Preserve existing overload shapes and boolean shortcuts unless there is strong evidence the repo is deprecating them.

### 14. Testing philosophy

- Dominant pattern: Behavior-first tests with inline components, explicit interaction sequences, and strong coverage of regression edges.
- Secondary pattern or exceptions: Modern rendering, suspense, and SSR scenarios are increasingly covered via Playwright e2e in addition to Jest.
- Evidence: `test/use-swr-middlewares.test.tsx`; `test/use-swr-local-mutation.test.tsx`; `test/use-swr-infinite.test.tsx`; `test/type/config.tsx`; `e2e/test/initial-render.test.ts`; commit `4acf841` migrating suspense-related tests to e2e.
- Practical rule for future code generation: When you add a behavior, add the most direct regression test at the same abstraction level that users experience it.

### 15. Comments and documentation

- Dominant pattern: The repo recently increased TSDoc coverage on public types and the main hook, but small helpers still rely mostly on naming plus short inline comments.
- Secondary pattern or exceptions: Some comments explicitly link to GitHub issues, React discussions, or browser bugs to justify non-obvious code.
- Evidence: `src/_internal/types.ts`; `src/index/use-swr.ts`; `src/_internal/utils/web-preset.ts:5-11`; `src/index/use-swr.ts:421`; commit `eff8fda`.
- Practical rule for future code generation: Add TSDoc on public surface changes and explanatory inline comments for tricky invariants. Do not over-comment straightforward helpers.

### 16. Readability style

- Dominant pattern: Short declarations, no semicolons, 2-space indent, single quotes, light whitespace, and explicit intermediate variables for tricky states.
- Secondary pattern or exceptions: Large orchestration functions use many inner helpers instead of splitting every branch into a separate top-level function.
- Evidence: `package.json` Prettier config; `.editorconfig`; `src/index/use-swr.ts`; `src/_internal/utils/mutate.ts`; `src/infinite/index.ts`.
- Practical rule for future code generation: Match the formatter exactly and prefer named intermediate variables over dense nested expressions when control flow becomes subtle.

### 17. Evolution patterns

- Dominant pattern: The active direction is stronger public documentation, more SSR/suspense/react-server support, and sustained compatibility across React versions.
- Secondary pattern or exceptions: Some tooling and config files still reflect an older package layout or ESLint setup.
- Evidence: recent git log entries around `src/index/use-swr.ts`, `src/_internal/types.ts`, e2e suspense migration, `react-server` export files, and stale `pnpm-workspace.yaml` / `test/tsconfig.json` / `test/type/.eslintrc`.
- Practical rule for future code generation: Follow the implemented runtime layout and newer docs/testing patterns, but do not "clean up" transitional config artifacts unless that is the explicit task.

### 18. Implicit engineering values

- Dominant pattern: Performance-sensitive correctness, public API stability, backward compatibility, local reasoning, and consumer type ergonomics.
- Secondary pattern or exceptions: Internal purity is not a goal in itself; the repo will accept mutable refs, sentinel values, and `any` where they make the runtime smaller or more compatible.
- Evidence: dedupe/race logic in `src/index/use-swr.ts`; state tracking in `src/mutation/state.ts`; type test suite; React legacy/canary CI; minimal dependency set in `package.json`.
- Practical rule for future code generation: If forced to choose, preserve correctness, compatibility, and consumer-facing type behavior over internal elegance.

## D. Preference rules for future code generation

- Prefer implementing new core behavior in `src/index/use-swr.ts` or `src/_internal/utils/*` instead of creating a parallel subsystem.
- Prefer extending `useSWR` via `withMiddleware` or a wrapper that reuses `serialize`, `createCacheHelper`, and `SWRGlobalState` when building a new feature entrypoint.
- Colocate feature-specific types with the feature module unless the same type is already needed across multiple public entrypoints.
- Extract a helper into `src/_internal/utils` only when it is reused or obviously becoming shared infrastructure.
- Keep source imports relative inside `src/`; use public package imports in tests when the goal is to validate the published API.
- Use `import type` for type-only imports.
- Use interfaces for public object contracts and overload-bearing APIs; use type aliases for unions, conditional types, and composed option objects.
- Use refs plus getter-based return objects when exposing hook state that should avoid rerendering on unaccessed fields.
- Use guard clauses early, then local helper closures, then a single async `try/catch` for the core request or mutation path.
- Throw for invariant violations or unsupported runtime cases, not for normal fetch failures.
- Prefer plain objects, tuples, `WeakMap`, and `Map` over classes, enums, or centralized store libraries.
- Add tests at the level the behavior lives: unit for pure helpers, Jest behavior tests for hook semantics, type tests for inference, e2e for SSR/suspense/router interactions.
- Match the repo formatter exactly: 2 spaces, no semicolons, single quotes, no trailing commas.
- Add comments only when explaining compatibility constraints, race handling, performance behavior, or historical gotchas.

## E. Decision heuristics

- When to create a new module: Create one when the logic is either a reusable primitive across multiple entrypoints or a distinct public feature boundary. Do not split merely because a file reached an arbitrary length.
- When to create a utility: Create a utility when the behavior is policy-light and reusable, like key serialization or config merging. Keep behavior-heavy orchestration near the hook that owns it.
- When to inline logic: Inline logic when it depends tightly on local refs, local config, or lifecycle sequencing. `useSWR` keeps many helpers inside the hook for that reason.
- When to generalize: Generalize only after two or more real call sites share the same primitive. The repo tolerates some duplication between `infinite`, `mutation`, and `subscription` to preserve local reasoning.
- When to create shared types: Share types when they represent a stable public contract or a genuinely reused internal protocol. Otherwise define them in the feature file.
- When to split files: Split small helpers eagerly; do not split orchestration-heavy or overload-heavy files unless doing so would improve ownership more than it would obscure the control flow.
- When to add comments: Add them when a future maintainer could not infer the reason from the code alone, especially around React behavior, SSR, suspense, timing, dedupe, or bug-linked workarounds.
- When to use refs over state: Use refs when the value is lifecycle bookkeeping, should not itself cause rerenders, or must survive async closures safely.
- When to use options objects: Use options objects for configuration and extensibility. Preserve boolean shorthand only where the existing API already accepts it.
- When to add e2e coverage: Add or prefer e2e when the behavior depends on hydration, router mode, suspense boundaries, server components, or render-count guarantees that Jest cannot model faithfully.

## F. Anti-patterns and styles that likely do not belong here

- Introducing classes or enums for runtime state. The implementation consistently uses functions, plain objects, tuples, `Map`, and `WeakMap` instead.
- Creating a new internal alias-based import system for `src/`. The codebase uses relative imports internally.
- Building a second cache/store abstraction beside `SWRGlobalState`, cache providers, and `createCacheHelper` for similar responsibilities.
- Throwing exceptions for normal request failures instead of surfacing them through SWR state and callbacks.
- Replacing getter-based hook responses with eagerly materialized plain values if that would break dependency tracking or rerender behavior.
- Over-generalizing feature-specific types into shared internal types before they are truly shared.
- Adding verbose "what this line does" comments to straightforward code.
- Introducing semicolons, double-quote style, or trailing commas in hand-written code that will fight the existing formatter.
- Returning to app-style React patterns inside runtime modules, such as pushing core behavior into component state trees instead of store/subscription primitives.

## G. Tension points and unresolved inconsistencies

- Source layout vs workspace metadata: The implemented code clearly treats `src/index` as the core entrypoint, but `pnpm-workspace.yaml` still lists a non-existent `core` package and `test/tsconfig.json` still maps `"swr"` to `./core/src/index.ts`. The dominant truth is the actual `src/` layout and root `package.json` exports.
- Flat ESLint config vs legacy `.eslintrc` files: The repo uses `eslint.config.mjs` at the root, but `examples/.eslintrc` and `test/type/.eslintrc` still exist, and `test/type/.eslintrc` extends a root `.eslintrc` that is no longer present. The dominant current style is the root flat config; the legacy files look transitional.
- Rich TSDoc vs traditional terse comments: `src/_internal/types.ts` and `src/index/use-swr.ts` now have extensive TSDoc, but most helper files still use only compact inline comments. The dominant direction appears to be fuller docs for public surfaces, not blanket TSDoc everywhere.
- Jest vs e2e coverage for suspense/SSR: Jest remains the main testing surface, but recent work moved some suspense coverage into Playwright. The dominant pattern is still "test heavily," with the execution environment chosen pragmatically.
- Strict public typing vs pragmatic runtime typing: The type surface is carefully engineered, but internals still use `any`, `unknown as`, and sentinel tricks. The dominant value is consumer-facing correctness, not internal type maximalism.
- React modernity vs compatibility: The repo actively targets React 19 and react-server exports, but it still carries React 17 compatibility branches and dedicated CI. The dominant rule is "use modern APIs only behind compatibility gates."

## H. Representative examples

- `src/index/use-swr.ts`: The best example of the repo's core instincts. It keeps complex lifecycle orchestration in one place, uses inner helper closures, refs, getter-based response objects, heavy guard logic, and issue-driven comments.
- `src/_internal/utils/cache.ts`: Shows the preferred shape of shared infrastructure: small, functional, cache-provider scoped, and built from plain objects and `WeakMap`-backed global state rather than large abstractions.
- `src/infinite/index.ts`: Demonstrates how feature modules extend the core without forking it. It reuses serialization, cache helpers, and global state while keeping feature-specific metadata local.
- `src/mutation/types.ts`: Represents the public-type philosophy: dense overloads and conditional typing to preserve user ergonomics, even when the runtime implementation is much simpler.
- `test/use-swr-middlewares.test.tsx`: Captures the extension model. Middleware ordering, key passing, context composition, and hook usage inside middleware are all treated as intentional public behavior.
- `test/type/config.tsx`: Shows that type behavior is part of the API contract, not an afterthought.
- `e2e/test/initial-render.test.ts`: Shows where the repo now validates modern rendering guarantees that are hard to trust in Jest alone.

## I. How to write code that belongs here

Write library code as if `useSWR` is the center of the system and everything else is an extension of it. Reuse the existing primitives for serialization, cache access, environment handling, and middleware composition instead of inventing parallel mechanisms. Keep helpers small and functional. Keep orchestration local when the behavior depends on timing, refs, or subtle React semantics.

At the type boundary, be generous with overloads and conditional types if they improve consumer inference. At runtime, be pragmatic: refs, `WeakMap`, sentinel values, and explicit local variables are acceptable if they make compatibility and rerender behavior easier to reason about. Favor comments that explain invariants, compatibility tradeoffs, or historical edge cases. Add tests that prove the user-visible behavior, and add type or e2e coverage whenever the change touches inference, SSR, suspense, or render timing.

## J. Evidence appendix

### Key directories inspected

- `src/`
- `src/_internal/`
- `src/index/`
- `src/infinite/`
- `src/mutation/`
- `src/subscription/`
- `test/`
- `test/type/`
- `test/unit/`
- `e2e/`
- `e2e/site/`
- `examples/`
- `.github/`

### Representative files inspected

- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `jest.config.js`
- `playwright.config.js`
- `pnpm-workspace.yaml`
- `.github/CONTRIBUTING.md`
- `.github/workflows/test-release.yml`
- `.github/workflows/test-legacy-react.yml`
- `.github/workflows/test-canary.yml`
- `src/index/use-swr.ts`
- `src/index/index.ts`
- `src/index/index.react-server.ts`
- `src/_internal/index.ts`
- `src/_internal/index.react-server.ts`
- `src/_internal/types.ts`
- `src/_internal/utils/cache.ts`
- `src/_internal/utils/config.ts`
- `src/_internal/utils/config-context.ts`
- `src/_internal/utils/env.ts`
- `src/_internal/utils/hash.ts`
- `src/_internal/utils/helper.ts`
- `src/_internal/utils/merge-config.ts`
- `src/_internal/utils/mutate.ts`
- `src/_internal/utils/normalize-args.ts`
- `src/_internal/utils/preload.ts`
- `src/_internal/utils/serialize.ts`
- `src/_internal/utils/shared.ts`
- `src/_internal/utils/subscribe-key.ts`
- `src/_internal/utils/use-swr-config.ts`
- `src/_internal/utils/web-preset.ts`
- `src/_internal/utils/with-middleware.ts`
- `src/infinite/index.ts`
- `src/infinite/types.ts`
- `src/immutable/index.ts`
- `src/mutation/index.ts`
- `src/mutation/state.ts`
- `src/mutation/types.ts`
- `src/subscription/index.ts`
- `src/subscription/types.ts`
- `test/utils.tsx`
- `test/use-swr-config.test.tsx`
- `test/use-swr-fetcher.test.tsx`
- `test/use-swr-infinite.test.tsx`
- `test/use-swr-local-mutation.test.tsx`
- `test/use-swr-middlewares.test.tsx`
- `test/use-swr-remote-mutation.test.tsx`
- `test/use-swr-server.test.tsx`
- `test/use-swr-subscription.test.tsx`
- `test/use-swr-legacy-react.test.tsx`
- `test/type/config.tsx`
- `test/type/mutate.ts`
- `test/type/subscription.ts`
- `test/unit/utils.test.tsx`
- `test/unit/web-preset.test.ts`
- `e2e/test/initial-render.test.ts`
- `e2e/site/app/server-prefetch-warning/page.tsx`
- `e2e/site/app/render-count/page.tsx`

### Limitations of the analysis

- I did not install dependencies or run the project. This report is based on static inspection plus git history sampling.
- I sampled `examples/` lightly because they are consumer demos, not the primary source of engineering truth for the library internals.
- I did not inspect every long test file end-to-end; I sampled representative sections across the main behavior areas.
- Recent git history was sampled to distinguish current direction from older patterns, but not every commit was reviewed.

### Areas where confidence is lower

- How aggressively the maintainers want to clean up stale workspace/test config references, because those files conflict with the current source layout.
- Whether the newer extensive TSDoc style will expand across more files or remain focused on public surfaces only.
- Exact future split between Jest and Playwright for suspense/SSR coverage, because current coverage is mixed and in transition.
