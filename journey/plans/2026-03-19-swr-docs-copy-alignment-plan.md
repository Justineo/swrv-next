# SWR docs copy alignment plan

Status: complete

## Goal

Bring the SWRV docs copy and examples materially closer to the upstream SWR docs source tree, while preserving Vue-native semantics and only diverging where React-specific assumptions must be replaced with `setup()` or `<script setup>` usage.

## Scope

- Reuse SWR page structure, section ordering, and example intent where practical.
- Prefer SWR-style phrasing for definitions, option descriptions, and guide flow.
- Keep SWRV-specific differences explicit instead of drifting into ad hoc wording.
- Preserve existing internal links and VitePress structure.
- Avoid React-only content or examples that cannot map cleanly to Vue.

## Execution steps

1. Build a page mapping between `packages/site/docs/*.md` and `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs/*.mdx`.
2. Identify priority pages:
   - `getting-started`
   - `api`
   - `arguments`
   - `data-fetching`
   - `conditional-fetching`
   - `error-handling`
   - `global-configuration`
   - `revalidation`
   - `mutation`
   - `pagination`
   - `prefetching`
   - `subscription`
   - `typescript`
   - `advanced/understanding`
   - `advanced/cache`
   - `advanced/performance`
3. Rewrite those pages so section names, definitions, and example narratives more closely mirror SWR where applicable.
4. Replace examples with Vue-equivalent versions of upstream SWR examples, using `setup()` or `<script setup>`.
5. Keep SWRV-specific caveats only where parity genuinely differs.
6. Run docs validation and record the new docs-content policy in journey memory.

## Success criteria

- The docs read recognizably like the SWR docs, not a separate ad hoc rewrite.
- Examples preserve the intent of SWR examples while remaining valid Vue composable usage.
- React-only concepts are not copied verbatim.
- The site builds cleanly and content remains internally consistent.
