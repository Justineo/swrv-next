# Compatibility shim removal

Date: 2026-03-20

## Summary

Removed the pre-release compatibility shims left behind by the SWR-structure alignment refactor.

## Changes

- deleted the top-level `packages/swrv/src/use-swrv.ts` forwarding file
- deleted the top-level `packages/swrv/src/use-swrv-handler.ts` forwarding file
- deleted the extra `packages/swrv/src/index/index.ts` forwarding layer
- repointed `immutable`, `infinite`, `mutation`, `subscription`, and the package root entry at the real `src/index/use-swrv.ts` module
- removed the temporary shared `SWRVHookWithArgs` export from `_internal/types.ts`
- kept the helper-only hook signature local to `_internal/with-args.ts` and `_internal/with-middleware.ts`
- trimmed `_internal/index.ts` so it no longer exports argument-normalization or middleware-wiring helpers

## Audit conclusion

The remaining split modules under `src/index/` are intentional runtime boundaries rather than
compatibility shims:

- `index/use-swrv.ts` owns the public overload surface and normalized entry path
- `index/use-swrv-handler.ts` owns the actual base-hook runtime
- `index/serialize.ts` owns `unstable_serialize`

No further compatibility-only files, interfaces, or exports remained after this pass.

## Validation

- `vp run swrv#check -- --fix`
- `vp test packages/swrv/tests`
- `vp run swrv#build`
- `vp exec playwright test`
- `vp pm pack -- --json --dry-run` in `packages/swrv`
- `vp run build -r`
