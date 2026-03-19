# SWR drift fixes log

Date: 2026-03-20

- Started implementing the remaining safe SWR-alignment fixes from the 2026-03-20 source audit.
- Added SWR-shaped public aliases at the root and `_internal` type boundaries: `Arguments`, `Key`, `State`, `Cache`, and `KeyedMutator`.
- Trimmed the root barrel so it no longer exports `RawKey`, `KeySource`, or `BoundMutator` as part of the public surface.
- Tightened `useSWRVInfinite` overloads so tuple keys support SWR-style positional fetcher inference for both positional and config-driven forms.
- Exported `SWRVInfiniteFetcher` from the infinite entry and aligned infinite config typing with the named fetcher alias.
- Tightened `MutationFetcher` so nullable or disabled mutation keys do not leak falsy key types into the fetcher callback.
- Extended type coverage for the new root aliases, the infinite tuple-fetcher surface, and nullable-key mutation fetchers.
- Validation:
  - `vp check` passed for the touched `packages/swrv` source and type-test files.
  - `vp test` passed for the full repository: 24 files, 221 tests.
  - `vp run swrv#build` passed.
  - Root `vp check` still fails on the pre-existing formatting drift in `packages/site/docs/.vitepress/theme/index.css`.
