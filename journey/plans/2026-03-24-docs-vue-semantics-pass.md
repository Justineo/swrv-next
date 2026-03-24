# Docs Vue semantics pass

Date: 2026-03-24
Status: in progress

## Goal

Remove React-shaped terminology from the documentation and rewrite the remaining wording in
Vue-native terms.

## Scope

- docs under `packages/site/docs`
- root/package README files only if they contain the same React-shaped wording

## Plan

1. Search the docs for terms such as `hook`, `hooks`, `mounted`, `unmounts`, `rerender`, and other
   React-shaped phrasing.
2. Review each hit in context and decide the Vue-native replacement:
   - `hook` -> `composable`, `useSWRV` call, or component using `useSWRV`
   - `mounted hook` -> mounted component / active consumer
   - `hook call` -> composable call when appropriate
3. Patch the affected docs while preserving the original technical meaning.
4. Update the journey log and validate with `vp check` and `vp run build -r`.
