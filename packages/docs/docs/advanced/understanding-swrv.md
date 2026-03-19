# Understanding SWRV

SWRV returns four primary state refs from `useSWRV`:

- `data`
- `error`
- `isLoading`
- `isValidating`

They move independently depending on the request stage.

## First request

On the first request with no cached data:

- `data` is `undefined` unless fallback data exists
- `isLoading` is `true`
- `isValidating` is `true`

When the request resolves:

- `data` becomes the resolved value
- `error` is cleared
- `isLoading` becomes `false`
- `isValidating` becomes `false`

## Revalidation

When cached data already exists and SWRV revalidates:

- `data` stays available
- `isLoading` stays `false`
- `isValidating` becomes `true`

That is the core stale-while-revalidate pattern.

## Key changes

When the key changes:

- SWRV evaluates the new key
- applies fallback data if present
- optionally keeps previous data when `keepPreviousData` is enabled
- decides whether to revalidate based on mount rules, stale rules, and fetcher availability

## Mutation

Mutation updates the cache first and then optionally revalidates. That is why optimistic updates, rollback, and function-style cache transforms can all live on the same primitive.

## Server rendering

On the server, hooks do not start fetches. They only read data that you already provided through config `fallback`, per-hook `fallbackData`, or snapshot hydration.
