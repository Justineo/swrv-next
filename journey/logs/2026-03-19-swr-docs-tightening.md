# SWR docs tightening

## Goal

Reduce the remaining content drift after the first SWR copy-alignment pass.

## Completed

- Expanded `advanced/performance` with SWR-style deduplication and dependency-tracking examples,
  while keeping the Vue-specific explanation for why SWR's React getter-based dependency collection
  is not ported directly.
- Expanded `advanced/understanding` with fuller state-machine explanation, `isLoading` versus
  `isValidating` guidance, and a more SWR-like `keepPreviousData` example.
- Tightened `advanced/cache` with a cache-clearing mutate example closer to the upstream cache docs.
- Added more detail to `mutation`, `pagination`, and `server-rendering-and-hydration` so the guide
  flow and explanation depth are closer to the SWR docs.
- Followed up on the drift audit by adding missing mutation option semantics, infinite-pagination
  caveats, and fuller state-machine explanation in `advanced/understanding`.

## Validation

- `vp check --fix`
- `vp test`
- `vp run site#build`

## Outcome

The remaining docs drift is now mostly intentional:

- Vue-specific composable usage requirements
- explicit SWRV SSR and hydration differences
- APIs or behaviors that SWRV exposes differently from SWR
