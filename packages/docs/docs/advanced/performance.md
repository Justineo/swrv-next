# Performance

SWRV performance is built around the same core goals as SWR:

- no unnecessary requests
- no unnecessary revalidation bursts
- no unnecessary cache churn

## Deduplication

Hooks sharing the same serialized key dedupe in-flight requests inside the same cache boundary.

That means repeated `useSWRV("/api/user", fetcher)` calls do not fan out into one request per component.

## Compare only on data

SWRV uses `compare` to preserve the current data identity when the next resolved value is equivalent.

That matters for:

- reducing reactive churn
- preserving stable data objects
- avoiding unnecessary downstream updates

## Keep previous data

`keepPreviousData` is often the right trade-off when a key changes but the screen should not drop back to an empty state.

## Poll carefully

`refreshInterval` is powerful, but it is still a policy choice. Prefer:

- deduped shared polling keys
- longer idle intervals
- function-style intervals when the server state can decide the cadence

## Why SWR dependency collection is not ported

SWR has a React-specific dependency collection mechanism that helps avoid object-level render work in React.

SWRV does not port that mechanism because Vue already tracks reactive reads at the ref level. SWRV returns separate refs for `data`, `error`, `isLoading`, and `isValidating`, so Vue's native dependency tracking already covers the important part of that performance story.

That means the performance work in SWRV should stay focused on:

- dedupe
- compare behavior
- cache boundary design
- unnecessary watch invalidation

not on re-creating React's getter-based state slicing.
