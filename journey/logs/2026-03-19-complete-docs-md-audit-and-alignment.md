# Complete docs md audit and alignment

Date: 2026-03-19
Status: complete

## Summary

I re-audited every Markdown page under `packages/site/docs` against the local SWR docs source tree
at `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs`.

The remaining differences after this pass are now intentional rather than accidental:

- Vue composable examples replace React component examples where `useSWRV` must stay inside
  `setup()` or `<script setup>`
- `server-rendering-and-hydration.md` replaces SWR's `with-nextjs` page
- `migrate-from-v1.md` is SWRV-specific
- `advanced/devtools.md` documents SWRV's built-in debug surface instead of SWR's third-party
  browser extension
- `advanced/performance.md` explains why SWR's React-only dependency collection is not ported to
  Vue
- visual embeds and framework-specific demo components from the SWR site are intentionally omitted

## File-by-file results

- `packages/site/docs/index.md`
  - intentional divergence
  - site homepage, 1.0 hero copy, and VitePress home structure have no direct SWR docs page match
- `packages/site/docs/getting-started.md`
  - aligned
  - only Vue setup syntax differs
- `packages/site/docs/api.md`
  - aligned with intentional extension
  - keeps SWR parameter and option structure, plus SWRV-specific companion APIs and subpaths
- `packages/site/docs/arguments.md`
  - aligned with intentional extension
  - includes Vue refs/computed keys and serialized-key notes
- `packages/site/docs/conditional-fetching.md`
  - aligned
- `packages/site/docs/data-fetching.md`
  - aligned
- `packages/site/docs/error-handling.md`
  - aligned
- `packages/site/docs/global-configuration.md`
  - aligned after tightening
  - added fuller shared-config example, default-config note, and stronger parity with SWR's context guidance
- `packages/site/docs/middleware.md`
  - aligned after tightening
  - added stronger API framing, TypeScript linkage, and logger-output guidance
- `packages/site/docs/mutation.md`
  - aligned after tightening
  - added missing mutate return-value example, optimistic update depth, `useSWRVMutation` trigger parity, and multi-key cache clearing guidance
- `packages/site/docs/pagination.md`
  - aligned after tightening
  - added stronger narrative around page abstractions, multi-page requests, unstable aggregate mutate, and advanced features
- `packages/site/docs/prefetching.md`
  - aligned with intentional divergence
  - the RSC section is replaced by explicit SWRV SSR and hydration guidance
- `packages/site/docs/revalidation.md`
  - aligned
  - visual media from SWR is intentionally omitted
- `packages/site/docs/subscription.md`
  - aligned
- `packages/site/docs/typescript.md`
  - aligned after tightening
  - added reusable config typing and middleware typing examples
- `packages/site/docs/server-rendering-and-hydration.md`
  - intentional divergence
  - this is SWRV's Vue SSR equivalent of SWR's `with-nextjs`
- `packages/site/docs/migrate-from-v1.md`
  - intentional divergence
  - SWRV-specific migration material
- `packages/site/docs/advanced/cache.md`
  - aligned after tightening
  - added stronger provider semantics, provider nesting notes, localStorage follow-up note, and test-reset parity
- `packages/site/docs/advanced/understanding.md`
  - aligned
- `packages/site/docs/advanced/performance.md`
  - aligned with intentional divergence
  - keeps SWR's performance framing but explicitly documents why dependency collection is Vue-native instead of getter-based
- `packages/site/docs/advanced/devtools.md`
  - intentional divergence
  - SWRV documents its built-in debug surface, not SWR DevTools

## Changes made in this pass

- expanded `global-configuration.md`
- expanded `middleware.md`
- expanded `mutation.md`
- expanded `pagination.md`
- expanded `advanced/cache.md`
- expanded `typescript.md`

## Validation

- `vp check`
- `vp test`
- `vp run site#build`
