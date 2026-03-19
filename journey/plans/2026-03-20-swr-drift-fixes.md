# SWR drift fixes

Date: 2026-03-20

## Goal

Implement the remaining safe SWR-alignment fixes identified in the source audit, focusing on:

- public hook type aliases and root type exports
- public/internal type-shape cleanup
- mutation and subscription type/runtime callback alignment
- simplifying the immutable wrapper where it is still carrying duplicated surface area

## Scope for this pass

1. Make exported hook aliases reflect the real callable surfaces.
2. Reduce public leakage of internal cache-state details from the root barrel.
3. Align mutation and subscription typing with runtime behavior and SWR naming/order where safe.
4. Remove unnecessary overload duplication in `immutable` if it can delegate to the base hook.
5. Run `vp check` and `vp test`.

## Out of scope unless the code changes stay obviously safe

- deeper layout moves such as reintroducing SWR's exact `src/index/index.ts` shape
- larger preload or provider-facade restructures that would widen behavioral risk

## Outcome

Completed in this pass:

1. Root public aliases now expose SWR-shaped names for arguments, key, cache state, cache adapter, and keyed mutate.
2. Root exports no longer leak `RawKey`, `KeySource`, or `BoundMutator`.
3. `useSWRVInfinite` now supports positional tuple-key fetcher inference and exports a named `SWRVInfiniteFetcher` type.
4. Mutation fetcher typing now strips falsy keys, matching the runtime requirement that missing keys reject before fetch.

Deferred:

1. Structural layout moves such as reintroducing SWR's exact `index/index.ts` and config placement.
2. Preload ownership changes that would move behavior from the current helper path into a built-in middleware layer.
