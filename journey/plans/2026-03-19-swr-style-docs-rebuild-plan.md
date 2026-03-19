# SWR-style docs rebuild plan

Date: 2026-03-19
Status: Completed

## Objective

Rebuild the entire `packages/site` documentation site from scratch so it follows the same page
structure, navigation model, and content depth as the upstream SWR docs, while still adapting the
content to Vue, SWRV-specific APIs, and the current `2.x` product scope.

This is not a polish pass. It is a docs reset.

## Why a reset is the right move

- The current docs tree is only directionally aligned with SWR. Several file names, navigation
  labels, and content scopes still diverge.
- The current home page and theme were improved, but they are still layered on top of a structure
  that was not rebuilt from the upstream docs source one-to-one.
- The docs need to become a first-class compatibility artifact. If the runtime follows SWR, the
  docs structure should do the same.
- The code block presentation should stop fighting VitePress. We should use the default VitePress
  code block styling and focus our design work on typography, spacing, color, and chrome.

## Source of truth

Primary content and structure source:

- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs`

Primary adaptation rules:

- keep the same broad file and navigation structure as SWR
- rewrite every page for Vue and SWRV instead of copying React wording
- keep SWR page depth and teaching style
- explicitly document every intentional SWRV difference from SWR where it matters
- omit only pages that are genuinely React-specific or product-out-of-scope

## Target directory structure

Target top-level docs files:

- `getting-started.md`
- `api.md`
- `arguments.md`
- `conditional-fetching.md`
- `data-fetching.md`
- `error-handling.md`
- `global-configuration.md`
- `revalidation.md`
- `middleware.md`
- `mutation.md`
- `pagination.md`
- `prefetching.md`
- `subscription.md`
- `typescript.md`
- `server-rendering-and-hydration.md`
- `migrate-from-v1.md`

Target advanced directory:

- `advanced/understanding.md`
- `advanced/cache.md`
- `advanced/performance.md`
- `advanced/devtools.md`

Target non-page assets:

- `.vitepress/config.ts`
- `.vitepress/theme/*`
- `public/mark.svg`

Pages that should not be direct ports:

- `with-nextjs.mdx`
  Adapt into `server-rendering-and-hydration.md`.
- `advanced/react-native.mdx`
  Omit. No Vue-native equivalent in the active scope.
- `suspense.mdx`
  Do not rebuild yet unless product scope changes. Keep it out of the active docs navigation for
  now.

## Current-to-target mapping

| Current SWRV file                   | Target file                         | Action                                                        |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `arguments-and-keys.md`             | `arguments.md`                      | Rename and rewrite to match SWR arguments page structure      |
| `automatic-revalidation.md`         | `revalidation.md`                   | Rename and rewrite to follow SWR revalidation page            |
| `mutation-and-revalidation.md`      | `mutation.md`                       | Rename and rewrite to follow SWR mutation page                |
| `prefetching-data.md`               | `prefetching.md`                    | Rename and rewrite to follow SWR prefetching page             |
| `advanced/understanding-swrv.md`    | `advanced/understanding.md`         | Rename and rewrite to match SWR advanced understanding page   |
| `migrate-from-v1.md`                | `migrate-from-v1.md`                | Keep path, expand content heavily                             |
| `server-rendering-and-hydration.md` | `server-rendering-and-hydration.md` | Keep path, rebuild from `with-nextjs` structure but Vue-first |
| `index.md`                          | `index.md`                          | Rebuild home page from scratch                                |

Files that can keep their names but still need full rewrites:

- `getting-started.md`
- `api.md`
- `conditional-fetching.md`
- `data-fetching.md`
- `error-handling.md`
- `global-configuration.md`
- `pagination.md`
- `subscription.md`
- `typescript.md`
- `advanced/cache.md`
- `advanced/performance.md`
- `advanced/devtools.md`

## Navigation target

Top navigation should stay minimal:

- `Docs`
- `API`
- `Migrate from v1`
- `GitHub`

Sidebar should follow SWR’s documentation order:

1. Getting started
2. API
3. Arguments
4. Conditional fetching
5. Data fetching
6. Error handling
7. Global configuration
8. Revalidation
9. Middleware
10. Mutation
11. Pagination
12. Prefetching
13. Subscription
14. TypeScript
15. Server rendering and hydration
16. Migrate from v1
17. Advanced
18. Advanced: Understanding
19. Advanced: Cache
20. Advanced: Performance
21. Advanced: Devtools

The docs tree should feel familiar to someone who already knows SWR.

## Content requirements

Every rebuilt page should match SWR’s depth, not just its title.

Each page should contain:

- a clear problem statement
- the core model or API contract
- progressively more advanced examples
- Vue-specific examples with `<script setup lang="ts">` where appropriate
- precise notes on where SWRV behaves like SWR and where it intentionally differs
- links to adjacent pages in the same learning flow

Examples should prefer:

- `fetch`-based examples unless a page specifically benefits from a shared custom fetcher
- Vue refs and composable usage directly
- short examples first, then more realistic provider or SSR cases

Examples should avoid:

- React vocabulary
- pseudo-framework abstractions unless the page is explicitly about SSR or app integration
- custom code block chrome beyond what VitePress already provides

## Visual design constraints

Keep:

- the restrained Kong-flavored palette
- the ribbon mark
- sentence case copy
- minimal home page rhythm

Change:

- use default VitePress code block styling everywhere
- design around the default VitePress docs shell instead of overriding core docs primitives too
  aggressively
- keep the home page to essentials only
- ensure light and dark mode both feel first-class, not one as an afterthought

## Execution phases

### Phase 1: freeze IA and filesystem

Deliverables:

- rename files to match SWR naming
- rebuild `.vitepress/config.ts` sidebar and nav around the target order
- remove leftover transitional labels like `automatic-revalidation` and `mutation-and-revalidation`
  from navigation

Done when:

- the tree and navigation match the target structure exactly

### Phase 2: reset the shared shell

Deliverables:

- simplify the VitePress theme to rely on default docs primitives more heavily
- keep the custom palette, typography, and logo
- preserve a custom but minimal home page
- keep the explicit home-page theme toggle

Done when:

- code blocks, search, nav, sidebar, footer, and docs chrome feel close to default VitePress with
  light branding, not custom reimplementation

### Phase 3: rebuild core pages

Pages:

- `getting-started`
- `api`
- `arguments`
- `conditional-fetching`
- `data-fetching`
- `error-handling`
- `global-configuration`
- `revalidation`

Done when:

- each page matches SWR’s depth and teaching order, but all code and wording are Vue-native

### Phase 4: rebuild data-flow pages

Pages:

- `middleware`
- `mutation`
- `pagination`
- `prefetching`
- `subscription`

Done when:

- advanced APIs are documented as first-class features with examples and edge-case notes

### Phase 5: rebuild platform pages

Pages:

- `typescript`
- `server-rendering-and-hydration`
- `migrate-from-v1`

Done when:

- the migration path, typed usage, and SSR model are documented with the same clarity as SWR’s
  platform pages

### Phase 6: rebuild advanced pages

Pages:

- `advanced/understanding`
- `advanced/cache`
- `advanced/performance`
- `advanced/devtools`

Done when:

- the advanced conceptual pages explain SWRV’s runtime model, cache model, and Vue-specific
  performance story without copying React-specific assumptions

## Completion notes

- The docs tree now uses the SWR-shaped filenames and navigation model, including `arguments.md`,
  `revalidation.md`, `mutation.md`, `prefetching.md`, `middleware.md`, and
  `advanced/understanding.md`.
- The custom theme was simplified to lean on the default VitePress shell more heavily while keeping
  the Kong-flavored palette, the SWRV ribbon mark, sentence case copy, and a minimal home page.
- The built-in VitePress code block treatment is now restored.
- The rebuilt content now matches the intended scope for the current `2.x` line, with Vue-correct
  `<script setup lang="ts">` examples and explicit adaptation of the old `with-nextjs` material
  into `server-rendering-and-hydration.md`.

- `advanced/understanding`
- `advanced/cache`
- `advanced/performance`
- `advanced/devtools`

Done when:

- advanced conceptual material explains SWRV internals and tradeoffs with SWR-like depth

### Phase 7: QA and consistency sweep

Deliverables:

- cross-link audit
- sentence case audit
- broken-link check
- examples compile sanity sweep
- visual QA in both modes and on mobile

Done when:

- `vp check`
- `vp run ready`
- manual preview review

## Parallelization

Sequential work:

- Phase 1 must finish before large-scale content rewriting starts.
- Phase 2 should finish before final visual QA.

Parallel-friendly work after Phase 1:

- core pages can be split across multiple agents
- data-flow pages can be split across multiple agents
- advanced pages can be split across multiple agents
- migration and SSR pages can be handled separately from core conceptual pages

Good delegation boundaries:

- one agent for filesystem plus navigation reset
- one agent for core docs pages
- one agent for mutation, pagination, prefetching, and subscription pages
- one agent for TypeScript, SSR, and migration pages
- one agent for advanced pages
- one agent for final copy and cross-link audit

## Risks

- A partial migration will leave naming, navigation, and page depth inconsistent. The reset has to
  be completed as one coherent lane.
- Over-adapting the SWR source can drift us away from the purpose of this rebuild. The docs should
  feel Vue-native, but still recognizably SWR-shaped.
- Rewriting content page-by-page without an IA freeze will create broken links and duplicated
  teaching content.
- Reintroducing heavy custom design work during the rewrite can distract from the more important
  goal: structural and content parity.

## First implementation batch

Start here:

1. Rename and remap the docs filesystem to the target SWR-like structure.
2. Rewrite `.vitepress/config.ts` so the nav and sidebar reflect the new tree.
3. Remove the custom docs code-block overrides from the theme.
4. Rebuild `getting-started.md`, `api.md`, and `arguments.md` first, using the SWR source pages as
   the template for depth and ordering.

That establishes the new spine for the rest of the docs rebuild.
