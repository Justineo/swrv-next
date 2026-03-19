# Fallback Data Typing Gap

Date: 2026-03-19
Status: Closed

## Question

Why does `swrv-next` still have one remaining non-suspense partial row in the upstream matrix for `test/type/config.tsx`, and what would it take to close it?

## Short Answer

The gap was fallback-data typing precision, and it is now closed in the current `swrv-next` type surface.

`swrv-next` now types `useSWRV(...).data.value` and `useSWRVImmutable(...).data.value` as defined when per-hook `fallbackData` is present in the call. That closes the last non-suspense partial row in the upstream matrix.

The closure ended up being smaller than a full SWR-style config-generic response redesign. `swrv-next` now uses a conditional response data type plus targeted fallback-aware public overloads, which was enough to close the parity case without destabilizing the rest of the hook surface.

## What SWR Does

In `swr/src/_internal/types.ts`, SWR uses:

- `BlockingData<Data, Options>`
  - resolves to `true` when `suspense: true` or `fallbackData` is present
- `SWRResponse<Data, Error, Config>`
  - `data` is conditionally typed:
    - `Data` when `BlockingData` is true
    - `Data | undefined` otherwise
- overloads that thread an options/config generic through the public `useSWR(...)` signatures
- helper types like `SWRConfigurationWithOptionalFallback<Options>` so the overloads can infer “fallback is present” from config shape without making the public call sites unusable

This is not isolated to one return type. It is a coordinated design across:

- `SWRResponse`
- `useSWR` overloads
- config helper types
- suspense typing

## Why `swrv-next` Still Differed

Before the fix, `swrv-next` modeled the base hook response as:

- `SWRVResponse<Data, Error>`
  - `data: Ref<Data | undefined>`

That design keeps the runtime and the Vue ref contract simple, but it means fallback presence is not reflected in the type.

I tried a smaller local refactor that only changed the public overloads to narrow `data.value` when `fallbackData` exists. That failed for the right reason: the change leaks into the whole response type surface and overload resolution.

The main friction points were:

- `SWRVResponse` would need a third generic for display data, not just cache data
- `useSWRV` overloads would need to thread a config generic through every relevant call form
- `useSWRVImmutable` would likely need the same treatment for consistency
- `SWRVHook` and middleware typing would need review because they currently assume a single `SWRVResponse<Data, Error>` shape
- compile-time behavior for Vue refs has to stay coherent, especially for `mutate`, middleware composition, and subpath APIs

## Outcome

The shipped solution is:

- add a conditional response data type so `SWRVResponse["data"]` can represent defined fallback-backed data
- keep the general hook surface stable
- add targeted fallback-aware overloads for base and immutable hooks instead of rewriting the entire hook or middleware type model

This closes the relevant `test/type/config.tsx` parity cases while keeping suspense-specific typing deferred.
