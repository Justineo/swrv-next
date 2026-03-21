# Helper alignment with SWR

Date: 2026-03-22

## Summary

Aligned small internal helper placement with SWR's shared utility pattern and
removed the standalone `promise-like.ts` file.

## Scope

- internal helper placement
- SWR alignment for cross-cutting primitives
- validation after refactor

## Changes

- introduced `_internal/shared.ts` for shared `noop`, `isFunction`, and
  `isPromiseLike`
- repointed `mutate.ts`, `preload.ts`, `web-preset.ts`, and `config-utils.ts`
  at the shared helper module
- re-exported the shared helpers from `_internal/index.ts`
- removed the standalone `_internal/promise-like.ts` file
- updated `journey/design.md` to reflect the SWR-style helper layout

## Validation

- `vp check --fix`
- `vp test`
