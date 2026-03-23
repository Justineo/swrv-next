# SWR Structure Alignment Round 2 Log

Date: 2026-03-22

- Started a fresh SWR-focused structure pass after deciding to prioritize
  closer alignment on module and helper organization, not just behavior.
- Reintroduced SWR-shaped internal constants, events, config, merge, middleware,
  preload, and `use-swr-config` ownership, and made `_internal/index.ts` a much
  more active composition surface again.
- Added SWR-shaped wrapper files under `_internal/utils/` and `src/index/`,
  including `index/index.ts`, `index/config.ts`, `index/use-swr.ts`, and
  `index/use-swr-handler.ts`, while keeping the older SWRV-named files only as
  compatibility shims.
- Removed `_internal/key-prefix.ts`, inlined internal-key filtering in mutate,
  moved `$sub$` handling back into `subscription/index.ts`, and collapsed
  `infinite` metadata back into the infinite cache entry instead of separate
  side stores.
- Added SWR-style public aliases where safe, including `SWRConfig`,
  `useSWRConfig`, `useSWR`, feature-hook aliases, and SWR-named type aliases.
- Validation passed after the alignment work:
  - `vp check src tests e2e scripts vite.config.ts package.json README.md tsconfig.json`
  - `vp run swrv#test`
  - `vp exec playwright test`
