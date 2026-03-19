# Fallback Data Typing Gap

Date: 2026-03-19
Status: Open

## Question

Why does `swrv-next` still have one remaining non-suspense partial row in the upstream matrix for `test/type/config.tsx`, and what would it take to close it?

## Short Answer

The remaining gap is fallback-data typing precision.

`swrv-next` currently types `useSWRV(...).data.value` as `Data | undefined` even when per-hook `fallbackData` is present. SWR types this more aggressively: when `fallbackData` or `suspense` guarantees data presence, `data` becomes non-undefined at the type level.

Closing that gap cleanly is not a small assertion tweak. It requires a public type-shape refactor similar to SWR’s `BlockingData` model.

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

## Why `swrv-next` Still Differs

`swrv-next` currently models the base hook response as:

- `SWRVResponse<Data, Error>`
  - `data: Ref<Data | undefined>`

That design keeps the runtime and the Vue ref contract simple, but it means fallback presence is not reflected in the type.

I tried a smaller local refactor that only changed the public overloads to narrow `data.value` when `fallbackData` exists. That failed for the right reason: the change leaks into the whole response type surface and overload resolution.

The main friction points are:

- `SWRVResponse` would need a third generic for display data, not just cache data
- `useSWRV` overloads would need to thread a config generic through every relevant call form
- `useSWRVImmutable` would likely need the same treatment for consistency
- `SWRVHook` and middleware typing would need review because they currently assume a single `SWRVResponse<Data, Error>` shape
- compile-time behavior for Vue refs has to stay coherent, especially for `mutate`, middleware composition, and subpath APIs

## Practical Options

### Option 1: Leave as documented difference for `2.0`

Pros:

- keeps the current public response shape stable
- avoids a wider type refactor late in the cycle
- matches the current runtime contract safely

Cons:

- leaves one meaningful non-suspense parity gap against SWR’s config typing

### Option 2: Do the full SWR-style response typing refactor

Pros:

- closes the last meaningful non-suspense partial row in the current upstream matrix
- gives `fallbackData` stronger ergonomic value for typed consumers

Cons:

- touches the core public hook typing model
- likely needs another matrix pass across base, immutable, infinite, mutation, middleware, and docs examples
- is bigger than the other parity fixes landed so far

## Recommendation

Treat this as an explicit follow-up task, not a drive-by cleanup.

If we want full non-suspense SWR type parity for `2.0`, this should be tackled as a focused type-surface refactor with its own verification pass. If we want to preserve the current `2.0` cut and avoid a late public-type redesign, it is reasonable to keep this as a documented intentional difference.
