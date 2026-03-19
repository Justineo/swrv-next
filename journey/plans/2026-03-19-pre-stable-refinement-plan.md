# Pre-stable refinement plan

Date: 2026-03-19
Status: Completed

## Why this plan exists

The previous non-suspense remaining-work view concluded that the repo-side work was mostly done and that the next steps were largely release operations outside the codebase. That is no longer the right execution lane.

Before the first stable release, `swrv-next` now needs one more deliberate product-quality pass in four areas:

1. more precise and elegant public and internal types
2. one final simplification and naming pass across the runtime and API surface
3. a complete docs information-architecture rebuild
4. a full docs-site visual redesign and copy polish

This plan intentionally reopens in-repo work before stable release. It supersedes the narrower "only release execution remains" view.

Completion note:

- The type cleanup, final simplification pass, docs IA rebuild, docs redesign, and sentence-case sweep are complete for the current scope.
- Validation closed cleanly with `vp run ready`, pack dry-runs, publish dry-runs, and a browser review of the rebuilt docs site.

## External references

This plan is grounded in the current repo and in the official upstream references:

- SWR docs homepage and navigation:
  [https://swr.vercel.app/](https://swr.vercel.app/)
  The current navigation exposes:
  `Getting Started`, `API`, `Arguments`, `Conditional Fetching`, `Data Fetching`, `Error Handling`, `Global Configuration`, `Middleware`, `Mutation & Revalidation`, `Pagination`, `Prefetching Data`, `Automatic Revalidation`, `Subscription`, `Suspense`, `TypeScript`, and `Usage with Next.js`.
- Vite homepage:
  [https://vite.dev/](https://vite.dev/)
  The site language emphasizes a strong hero, clear primary and secondary calls to action, restrained but high-energy gradients, generous whitespace, and structured feature blocks.
- VoidZero homepage:
  [https://voidzero.dev/](https://voidzero.dev/)
  The site language emphasizes calm but high-contrast surfaces, concise editorial copy, strong category blocks, and productized open-source presentation.
- Local SWR docs source:
  `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs`
  This is the most useful reference for the docs rewrite because it exposes the actual page set and the `advanced/*` section used by the current SWR docs source tree.

## Goals

- Reduce unsound type casts and `any` usage to the smallest practical set.
- Make the public API easier to read, infer, and document.
- Remove the last unnecessary internal abstractions and naming noise.
- Rebuild the docs so they feel familiar to SWR users while staying Vue-native.
- Redesign the docs site so it feels intentional, modern, and polished rather than template-default.
- Enforce sentence case across docs, site chrome, and non-code copy.

## Non-goals

- Implementing or documenting full `suspense` support in this lane.
- Nuxt-specific adapters or framework modules.
- External release execution steps such as final npm Trusted Publisher verification and the actual stable publish.
- Preserving internal contracts for their own sake. Internal compatibility is not a constraint for this pass.

## Current baseline

### Type and cast hotspots

Current hotspots by `any` and cast density in `packages/swrv/src`:

- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/_internal/cache-helper.ts`
- `packages/swrv/src/subscription/index.ts`
- `packages/swrv/src/mutation/index.ts`
- `packages/swrv/src/_internal/middleware-stack.ts`
- `packages/swrv/src/_internal/client.ts`
- `packages/swrv/src/use-swrv-handler.ts`
- `packages/swrv/src/config-utils.ts`
- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/_internal/web-preset.ts`

Observed patterns that should be reduced or eliminated:

- `as unknown as` bridges around middleware and hook wrappers
- `as never` casts around normalized argument plumbing
- `ResolvedSWRVConfiguration<Data, any>` and similar generic fallbacks
- `CacheState<any, any>` and provider-level `any` propagation
- broad `PropType<...any...>` usage in config context

### Docs baseline

The current docs set is still shaped like a compact project site rather than a top-tier reference:

- `index.md`
- `guide.md`
- `examples.md`
- `api.md`
- `ssr.md`
- `migration.md`
- `parity.md`
- `status.md`

Current navigation is too flat and too repo-centric. It does not match the way SWR users learn and look up features.

### Upstream docs structure from the local SWR docs source

The local SWR docs source currently organizes its primary pages as:

- `getting-started`
- `api`
- `arguments`
- `conditional-fetching`
- `data-fetching`
- `error-handling`
- `global-configuration`
- `middleware`
- `mutation`
- `pagination`
- `prefetching`
- `revalidation`
- `subscription`
- `suspense`
- `typescript`
- `with-nextjs`

And its `advanced/*` section currently contains:

- `advanced/understanding`
- `advanced/cache`
- `advanced/performance`
- `advanced/devtools`
- `advanced/react-native`

That should be treated as the concrete source model for the SWRV docs rewrite, with Vue-native substitutions where React-specific topics do not apply.

## Working principles

- Prefer fewer concepts over more helper layers, as long as behavior stays explicit.
- Prefer names that are short in their local context and descriptive in their module context.
- Prefer real generic relationships over cast-based type recovery.
- Prefer one obvious public path per capability.
- Prefer docs that teach by task and behavior, not by package inventory.
- Use sentence case for headings, page titles, nav labels, buttons, callouts, and prose unless a proper noun or code literal requires another form.

## Workstream 1: Type precision and API surface cleanup

### Objective

Make the type system feel deliberate instead of recovered after runtime normalization.

### Main targets

- remove or sharply reduce `as unknown as`
- remove most `as never` plumbing in public hook wrappers
- reduce `any` usage in internal runtime types
- make the public overloads and helper types read cleanly in editor tooltips
- keep the remaining unavoidable casts narrow, local, and justified

### Primary modules

- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/use-swrv.ts`
- `packages/swrv/src/use-swrv-handler.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/mutation/index.ts`
- `packages/swrv/src/subscription/index.ts`
- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/config-utils.ts`
- `packages/swrv/src/_internal/cache-helper.ts`
- `packages/swrv/src/_internal/middleware-stack.ts`

### Planned tasks

1. Split the current all-purpose type layer into clearer slices.
   The current `_internal/types.ts` should stop carrying unrelated public, provider, middleware, cache, mutation, and subscription concerns in one file.

2. Separate public type shapes from runtime-only helper types.
   Public exported types should optimize for readability and editor UX. Runtime helper types can stay more structural and local.

3. Replace cast-heavy argument normalization with typed normalization results.
   Public entrypoints should normalize arguments once and then pass explicit typed objects into handlers instead of using `as never` to force overloaded signatures through.

4. Rework middleware typing so wrappers do not need double-casts.
   `useSWRV`, `infinite`, `mutation`, and `subscription` should all consume a shared, explicit middleware handler contract.

5. Tighten cache and provider generics.
   `CacheState`, provider adapters, listener payloads, and helper identities should stop leaking `any` through the provider boundary by default.

6. Revisit the public type exports.
   Remove redundant public types, rename awkward ones, and group the remaining exports so the main API surface reads more like SWR's public types while remaining Vue-native.

7. Expand and reorganize type tests.
   The current compile-time coverage should be split by feature area so regressions are easier to attribute:
   base, config, infinite, mutation, subscription, SSR, and public exports.

### Acceptance criteria

- No `as unknown as` remains in public hook entry modules unless it is a well-documented framework interop boundary.
- Remaining `any` usage is concentrated in a very small number of unavoidable framework-facing locations.
- Editor hover output for `useSWRV`, `useSWRVInfinite`, `useSWRVMutation`, and `useSWRVSubscription` is materially simpler.
- All public type tests pass and are easier to navigate by feature area.

## Workstream 2: Final simplification and naming pass

### Objective

Distill the implementation closer to the core ideas behind SWR's module structure: thin public modules, explicit shared state helpers, and feature modules that own only one concern each.

### Main targets

- remove unnecessary helper indirection introduced during parity work
- simplify internal and public naming
- trim overloaded or redundant API surface where it does not buy clarity
- reduce large-module cognitive load without fragmenting the codebase for its own sake

### Primary modules

- `packages/swrv/src/use-swrv-handler.ts`
- `packages/swrv/src/_internal/client.ts`
- `packages/swrv/src/_internal/provider-state.ts`
- `packages/swrv/src/_internal/cache-helper.ts`
- `packages/swrv/src/config.ts`
- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/config-utils.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/mutation/index.ts`
- `packages/swrv/src/subscription/index.ts`

### Planned tasks

1. Audit every internal module for single responsibility.
   If a module owns both normalization and execution, or both provider state and behavior policy, split or flatten it.

2. Rename internal types, helpers, and local variables for context-local clarity.
   Drop repeated `SWRV` prefixes where the module already provides context.
   Replace names that reflect historical implementation steps instead of present meaning.

3. Simplify the public API naming where stable release is not yet cut.
   If any exported helper or type is awkward, redundant, or too implementation-shaped, fix it now rather than after stable.

4. Remove duplicated helper flows.
   Common examples to look for:
   argument normalization repeated across features, duplicated config merging, duplicate key-state helpers, and wrapper layers that only forward data.

5. Revisit advanced-feature boundaries.
   `infinite`, `mutation`, and `subscription` should each expose one clear public entry and keep private state helpers private.

6. Finish with a naming review round.
   Review variable, parameter, function, type, and interface names in the touched modules specifically for sentence-level readability.

### Acceptance criteria

- No major internal module feels "manager-shaped" without a good reason.
- Feature entrypoints are thin and obvious.
- Names read naturally without requiring project history to interpret them.
- Public exports feel smaller and more intentional than they do today.

## Workstream 3: Docs information architecture rebuild

### Objective

Rebuild the docs so they feel familiar to SWR users while presenting the Vue-native contract clearly and cleanly.

### Target structure

The docs should broadly mirror the way the official SWR docs are organized, with Vue-specific adjustments where needed.

Proposed top-level structure:

- Home
- Getting started
- API
- Arguments and keys
- Conditional fetching
- Data fetching
- Error handling
- Global configuration
- Automatic revalidation
- Mutation and revalidation
- Pagination
- Prefetching data
- Subscription
- TypeScript
- Server rendering and hydration
- Middleware
- Migration from SWRV
- Compatibility and status

Explicitly deferred or secondary topics:

- Suspense
  Keep out of the primary navigation until the product decision changes.
- Nuxt integration
  Mention as follow-up work, not as a first-class docs branch in this lane.

### Concrete page mapping from SWR docs to SWRV docs

The rewrite should use the local SWR docs tree as the source template and adapt each page deliberately:

- `getting-started` -> `getting-started`
  Same role. Rewrite examples and installation for Vue composables and the `swrv` package.
- `api` -> `api`
  Same role. Cover `useSWRV`, `SWRVConfig`, `useSWRVConfig`, `mutate`, `preload`, and subpath APIs.
- `arguments` -> `arguments-and-keys`
  Same content category, but use a name that is clearer in a Vue docs sidebar.
- `conditional-fetching` -> `conditional-fetching`
  Same role with Vue examples.
- `data-fetching` -> `data-fetching`
  Same role with Vue-native fetcher usage and composable examples.
- `error-handling` -> `error-handling`
  Same role.
- `global-configuration` -> `global-configuration`
  Same role, centered on `SWRVConfig`.
- `middleware` -> `middleware`
  Same role, but include the built-in debug or devtools middleware story.
- `mutation` -> `mutation-and-revalidation`
  Same content area, but align the title with the current SWR docs wording.
- `pagination` -> `pagination`
  Same role, centered on `useSWRVInfinite`.
- `prefetching` -> `prefetching-data`
  Same role, centered on `preload`.
- `revalidation` -> `automatic-revalidation`
  Same role and title shape as SWR.
- `subscription` -> `subscription`
  Same role.
- `typescript` -> `typescript`
  Same role, but broader because SWRV needs to explain Vue refs and composable return typing.
- `with-nextjs` -> `server-rendering-and-hydration`
  Replace the framework-specific React page with the first-party Vue SSR and hydration story.
- `advanced/understanding` -> `advanced/understanding-swrv`
  Keep as an advanced conceptual page. Use Vue-native state diagrams and explain `data`, `error`, `isLoading`, and `isValidating`.
- `advanced/cache` -> `advanced/cache`
  Same role.
- `advanced/performance` -> `advanced/performance`
  Same role, but explicitly explain why SWR's React-only dependency-collection model is not ported into Vue.
- `advanced/devtools` -> `advanced/devtools`
  Same role, but document the built-in SWRV debug middleware and any supported inspection hooks before discussing external tooling.
- `advanced/react-native` -> not in stable `2.0` docs
  Do not create a direct equivalent in this lane. The analogous topic would be custom focus and reconnect event sources, which can be covered under global configuration or advanced cache and runtime customization.
- `suspense` -> deferred
  Keep outside the active docs tree until the product scope changes.

### Planned tasks

1. Build a page-by-page mapping from current docs to the new structure.
   Do not just rename files. Rewrite for the target information architecture.

2. Rewrite the home page to be product-first.
   It should explain what SWRV is, why it exists, how it relates to SWR, and how to start using it immediately.

3. Split the current guide and API material into task-shaped pages.
   The docs should answer "how do I do X?" before "what files exist?"

4. Rewrite the API reference so each hook follows the same template.
   Signature, behavior, options, return shape, examples, Vue-specific notes, and parity notes.

5. Add a proper TypeScript page.
   This workstream depends on the type cleanup pass because the docs must describe the refined API surface, not the old one.

6. Keep migration and compatibility pages, but demote them from being the main shape of the site.
   They are supporting pages, not the primary learning path.

7. Audit every page for sentence case, tone consistency, and cross-link quality.

### Acceptance criteria

- A React SWR user can predict where to find a topic in the SWRV docs.
- A Vue user can still understand the important API differences quickly.
- The docs are structured as a learning and reference system, not as a repo overview.
- Examples and snippets compile against the final API.

## Workstream 4: Docs site redesign

### Objective

Give the docs site a distinctive, high-quality visual identity informed by the current VoidZero and Vite design language, without cloning those sites mechanically.

### Design findings to use

From the official Vite and VoidZero sites, the useful transferable patterns are:

- a clear hero with one primary action and one secondary action
- calm but high-energy color usage through restrained gradients and glowing accents
- generous whitespace and strong vertical rhythm
- crisp typography hierarchy with concise headings
- feature cards and content blocks that feel editorial rather than dashboard-like
- polished but subtle surfaces, borders, and shadows
- clear content prioritization instead of dense chrome

### Planned tasks

1. Define the docs design system.
   Create a small set of semantic tokens for color, spacing, surface, border, radius, shadow, and code styling.

2. Build a custom VitePress theme layer.
   At minimum:
   home hero, page header, feature grid, callout blocks, aside notes, code-group polish, nav and sidebar styling, and footer treatment.

3. Redesign the home page completely.
   It should feel like a modern product page, not a default VitePress landing page.

4. Redesign the documentation reading experience.
   Improve line length, heading rhythm, code block framing, outline behavior, and sidebar clarity.

5. Use sentence case throughout the site chrome.
   Nav labels, buttons, feature cards, headings, callouts, and section labels should all follow the same rule.

6. Run a final visual consistency pass in both light and dark themes.

### Acceptance criteria

- The site feels intentionally designed at first glance.
- The reading experience is calmer and clearer than the current docs.
- The home page communicates product value immediately.
- The design stays maintainable inside VitePress instead of depending on fragile one-off overrides.

## Recommended execution order

### Phase 1: Baseline audit and guardrails

Objective:
Create the working inventories before changing behavior or copy.

Tasks:

- produce a type-debt inventory by file and pattern
- produce a naming audit for the main runtime modules
- produce a docs-page mapping from current files to target IA
- define the docs copy rules, including sentence case
- define the visual design tokens and component list

### Phase 2: Type system cleanup

Objective:
Stabilize the refined public and internal type model first so later code and docs are describing the right surface.

Tasks:

- refactor shared types
- refactor hook argument normalization
- refactor advanced hook generic boundaries
- split and expand type tests

### Phase 3: Final simplification and naming

Objective:
Use the new type model to simplify the runtime and rename the remaining awkward surfaces.

Tasks:

- flatten redundant helpers
- simplify module boundaries
- rename internal and public symbols where justified
- run the first full code simplification review

### Phase 4: Docs information architecture rewrite

Objective:
Rebuild the documentation structure and rewrite the core content against the now-stable API.

Tasks:

- create the new docs tree
- rewrite reference and guide pages
- migrate examples into the right learning path
- add the dedicated TypeScript page

### Phase 5: Docs site redesign

Objective:
Apply the new visual system on top of the rewritten docs.

Tasks:

- implement the custom theme layer
- redesign the home page
- restyle the reading experience
- polish the navigation and sidebar

### Phase 6: Final review and release-readiness revalidation

Objective:
Reconfirm that the refined repo is still technically and editorially release-ready.

Tasks:

- rerun `vp check`, `vp test`, and `vp run ready`
- rerun package and publish dry-runs
- review generated declarations and packed artifacts
- run a final copy and sentence-case sweep
- run three explicit review rounds for:
  - type elegance
  - runtime simplification
  - docs quality and design consistency

## Parallelization guidance

Safe to run in parallel:

- docs IA mapping and docs design research
- type-debt inventory and naming audit
- home-page design exploration and docs copy-style definition

Should stay mostly sequential:

- public type cleanup before the final API docs rewrite
- final naming cleanup before sentence-case copy freeze
- docs redesign after the target IA is locked

Good subagent candidates later:

- type-test extraction by feature area
- docs page rewrites once the final IA is fixed
- docs theme implementation on disjoint files
- copy audit for sentence case and terminology consistency

## Risks and watchpoints

- Over-optimizing types can make them more clever but less understandable. The goal is clarity, not maximum generic gymnastics.
- A late public naming change can ripple through docs, examples, tests, and package exports. That is still better now than after stable.
- Docs redesign can drift into visual novelty without improving comprehension. The information architecture must lead the design, not the other way around.
- It is easy to over-fragment the runtime when simplifying. Fewer concepts matter more than more files.
- Sentence-case enforcement must not break proper nouns, package names, or code literals.

## Definition of done

This plan is complete when all of the following are true:

- the public and internal type layers are materially cleaner and cast-light
- the remaining runtime and naming complexity has been reduced in the main hotspots
- the docs structure mirrors SWR's learning model closely enough to feel familiar
- the docs site has a new polished design system and product-quality home page
- sentence case is consistently applied across site chrome and prose
- the full validation and release-readiness dry-run suite still passes

Only after that should the project return to the stable-release execution lane.
