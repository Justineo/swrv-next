# SWR-style docs rebuild

Date: 2026-03-19

## Goal

Rebuild `packages/site` from scratch so the docs tree, navigation, and content depth track the
upstream SWR docs structure while staying Vue-native and accurate for the current SWRV `2.x` scope.

## Completed work

- renamed the transitional docs files to the SWR-shaped filenames:
  - `arguments.md`
  - `revalidation.md`
  - `middleware.md`
  - `mutation.md`
  - `prefetching.md`
  - `advanced/understanding.md`
- rebuilt the VitePress nav and sidebar around the SWR-style guide and advanced ordering
- simplified the custom VitePress theme so it leans on the default docs shell more heavily
- restored the built-in VitePress code block treatment instead of maintaining custom code block
  chrome
- kept the Kong-flavored palette, the SWRV ribbon mark, sentence case copy, and the minimal custom
  home page
- rewrote all guide, platform, and advanced pages to match the upstream SWR teaching flow while
  adapting the content for Vue and SWRV
- added explicit Vue-correct examples so `useSWRV` and companion composables are shown inside
  `setup()` or `<script setup>`
- adapted the old `with-nextjs` conceptual material into the Vue-first
  `server-rendering-and-hydration.md` page
- kept React-only or out-of-scope material out of the active docs nav, especially `suspense` and
  `advanced/react-native`

## Validation

- `vp check`
- `vp test`
- `vp run build -r`

## Notes

- The docs build stays on VitePress `2.0.0-alpha.16` as already decided in project memory.
- The docs reset included `middleware.md` in the main guide even though the earlier draft plan did
  not list it in the first target file set, because the user asked for a structure and navigation
  closer to the real SWR docs tree and middleware is an in-scope documented feature in SWRV.
