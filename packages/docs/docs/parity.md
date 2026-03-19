# Parity

## SWR As The Main Reference

`swrv-next` treats SWR 2.4.1 as the main behavioral and API reference for the
client-side stale-while-revalidate model. The goal is not a literal React port;
the goal is to match the useful semantics while presenting them as an idiomatic
Vue runtime.

## Areas Of Strong Parity

- request dedupe, background revalidation, retry, and callback timing
- focus and reconnect revalidation with provider-level overrides
- config-level `fallback`, shared fetchers, and provider-style cache boundaries
- global and bound `mutate`
- preload reuse and serialized-key matching
- `immutable`, `infinite`, `mutation`, and `subscription` entry points
- SSR snapshot serialization and hydration helpers for explicit client handoff

## Intentional Vue Adaptations

- returned state is exposed through refs
- tuple keys are typed as positional fetcher arguments
- `SWRVConfig` is the natural place for app-level config and cache scoping
- usage is tied to `setup()` or an active Vue effect scope rather than React render cycles

## Areas Where SWR Still Leads

- suspense integration that depends on React rendering mechanics
- React-specific ecosystem integrations and extension ergonomics
- a longer-established public compatibility surface across more consuming apps

## Legacy SWRV Comparison

Compared with the legacy `swrv` codebase, the rebuild is a new generation
rather than a small modernization pass:

- runtime state is client-scoped instead of implicitly module-global
- API shape is much closer to SWR's current entry-point model
- tests, type coverage, docs, CI, and release automation are all materially stronger
- `serverTTL` is intentionally not part of the rebuilt core API

## Use This Page With The Status Page

- use the [Status](/status) page for what is shipped, deferred, and intentionally different in the current release line
- use this page for the higher-level relationship between `swrv-next`, SWR, and legacy SWRV
