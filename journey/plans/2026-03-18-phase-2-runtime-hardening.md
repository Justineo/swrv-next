# Phase 2 Runtime Hardening

Date: 2026-03-18
Status: Proposed next phase

## Goal

Turn the current bootstrap implementation into a stronger SWR-aligned runtime by closing the biggest behavior gaps before broadening docs or release activity further.

## Immediate Priorities

1. Harden `useSWRV` core behavior.
   - Re-check mount, stale, retry, focus, reconnect, and refresh semantics against SWR 2.4.1.
   - Tighten race handling between fetches and mutations.
   - Decide whether TTL remains a first-class runtime concern or becomes a compatibility layer.

2. Deepen advanced API parity.
   - Expand `swrv/mutation` to cover more of SWR's option semantics and lifecycle guarantees.
   - Make `swrv/infinite` less "aggregate only" and closer to SWR's page-oriented behavior.
   - Revisit `swrv/subscription` lifecycle details and cache reset behavior.

3. Expand the test matrix.
   - Port SWR behavior tests by domain instead of writing only bespoke local tests.
   - Add type tests for public exports and generics.
   - Add browser-facing smoke tests for focus/reconnect and docs examples.

4. Improve docs from "present" to "useful".
   - Add runnable examples for base usage, optimistic mutation, infinite loading, and scoped clients.
   - Document the current parity line and the known differences from both SWR and legacy SWRV.
   - Add an SSR/Nuxt section once the runtime contract is clearer.

5. Finish release hardening.
   - Dry-run the release workflow assumptions locally where possible.
   - Verify package contents and export paths from the built tarball.
   - Confirm the npm Trusted Publisher setup requirements that must be completed outside the repo.

## Recommended Order

1. Core runtime semantics
2. Advanced API semantics
3. Test expansion
4. Docs examples and parity notes
5. Release dry-run and package audit

## Exit Criteria

- The base hook behavior is closer to SWR for the key revalidation and race cases.
- Advanced APIs are no longer only "initial slice" implementations.
- Public type coverage exists for the package root and subpaths.
- Docs explain what is implemented today versus still in progress.
- The publish flow is validated beyond static workflow files.
