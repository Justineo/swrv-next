# Docs drift audit log

Date: 2026-03-19

Reviewed `packages/site/docs` against the upstream SWR docs in `/Users/yiling.gu@konghq.com/Developer/Justineo/swr-site/content/docs`.

Shared-page overlap reviewed:

- advanced/cache
- advanced/devtools
- advanced/performance
- advanced/understanding
- api
- arguments
- conditional-fetching
- data-fetching
- error-handling
- getting-started
- global-configuration
- middleware
- mutation
- pagination
- prefetching
- revalidation
- subscription
- typescript

Not flagged as drift:

- local-only pages (`server-rendering-and-hydration`, `migrate-from-v1`)
- intentional Vue/SWRV-specific divergence where upstream guidance is React/Next.js/RSC/Suspense specific or no longer maps cleanly

Highest-value remaining drift still applicable to SWRV:

- `mutation.md`: still materially thinner than upstream in mutation option semantics and multi-key mutation guidance
- `pagination.md`: missing some operational caveats and explanatory detail around infinite pagination behavior
- `advanced/understanding.md`: keeps headings but compresses the state-machine teaching content substantially
