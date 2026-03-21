# Repository analysis reflection against SWR

Date: 2026-03-21
Status: completed

## Purpose

This note records the repository analysis report and then re-evaluates its
findings against the local SWR reference implementation under:

- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src`

The goal is to keep only the findings and recommendations that are actually
valuable. If SWRV complexity is broadly aligned with SWR's own architecture,
that complexity should be treated as acceptable rather than as a refactor
target.

## Inputs reviewed

### SWRV

- `packages/swrv/src/index/use-swrv-handler.ts`
- `packages/swrv/src/index/use-swrv.ts`
- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/config-utils.ts`
- `packages/swrv/src/_internal/client.ts`
- `packages/swrv/src/_internal/provider-state.ts`
- `packages/swrv/src/_internal/web-preset.ts`
- `packages/swrv/src/_internal/with-middleware.ts`
- `packages/swrv/src/_internal/types.ts`
- `packages/swrv/src/infinite/index.ts`
- `packages/swrv/src/mutation/index.ts`
- `packages/swrv/src/subscription/index.ts`
- `packages/site/docs/.vitepress/config.ts`
- `packages/site/docs/.vitepress/theme/index.css`
- `packages/site/docs/index.md`

### SWR

- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/cache.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/resolve-args.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/with-middleware.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/config-context.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/_internal/utils/web-preset.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/infinite/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/mutation/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/subscription/index.ts`
- `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/immutable/index.ts`

## First-pass report, recorded

The first-pass repository analysis concluded:

- the repo architecture is broadly sound and matches `journey/design.md`
- the main complexity hotspot is still the base hook runtime
- `useSWRVInfinite` is the second major complexity hotspot
- the docs site has metadata and ownership drift relative to the current repo
- there are smaller cleanup opportunities in dead code and duplicated helpers

That first pass also suggested several architectural refactors. After checking
against SWR, some of those recommendations are too aggressive and should be
dropped.

## Reflection: what is actually acceptable

### 1. A large base-hook runtime is normal, not a local smell

SWR itself keeps most runtime complexity inside one large base hook:

- SWR: `src/index/use-swr.ts`
- SWRV: `packages/swrv/src/index/use-swrv-handler.ts`

This is not a sign that SWRV is over-engineered relative to the reference. It
is the same architectural choice:

- request lifecycle
- dedupe
- stale response handling
- retries
- focus or reconnect revalidation
- polling
- cache synchronization

Conclusion:

- Do not prioritize splitting `use-swrv-handler.ts` just to reduce line count.
- Only split it later if a concrete maintainability problem appears during
  feature work.

### 2. Eager default client or cache initialization is acceptable

The first pass flagged import-time default client setup in SWRV:

- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/_internal/client.ts`

SWR does the same kind of eager default cache initialization:

- `src/_internal/utils/config.ts` initializes default cache and mutate
- `src/_internal/utils/cache.ts` attaches focus and reconnect listeners for a
  provider when initialized

Conclusion:

- Default client creation at module load is aligned with SWR's design.
- This is not a justified refactor target on its own.

### 3. The middleware bridge and feature-level type casts are acceptable

The first pass treated SWRV's middleware bridge as suspicious because of the
extra indirection and type coercion in:

- `packages/swrv/src/_internal/with-middleware.ts`

SWR does the same thing:

- `src/_internal/utils/with-middleware.ts`
- `src/infinite/index.ts`
- `src/mutation/index.ts`
- `src/subscription/index.ts`

Its own advanced hooks explicitly rely on type casts because the feature hook
signatures diverge from the base hook shape.

Conclusion:

- The SWRV middleware bridge is not evidence of accidental complexity by
  itself.
- Do not rewrite this area unless there is a real type-safety or ergonomics
  bug.

### 4. `useSWRVInfinite` having its own orchestration is acceptable

The first pass suggested reworking `useSWRVInfinite` to delegate more of its
fetch lifecycle to shared primitives.

SWR's `useSWRInfinite` does not do that either. Its implementation also owns:

- page-size state
- page-level cache reads and writes
- page-level fetch decisions
- page-level preload consumption
- aggregate mutate semantics

Conclusion:

- SWRV's `infinite/index.ts` is complex, but that complexity is reference-like.
- Rewriting it to "reuse more of the base hook" is not currently justified.

### 5. Cache-keyed feature state is acceptable

The first pass called out side stores keyed by cache identity:

- `packages/swrv/src/infinite/state.ts`
- `packages/swrv/src/subscription/state.ts`

SWR scopes the same kinds of structures by cache provider too:

- `SWRGlobalState`
- `subscriptionStorage` in `src/subscription/index.ts`

Conclusion:

- Keying side stores by cache boundary is aligned with SWR.
- This should remain the default ownership model.

### 6. Module-global `online` state is acceptable

SWRV uses a module-global online flag in:

- `packages/swrv/src/_internal/web-preset.ts`

SWR does the same in:

- `src/_internal/utils/web-preset.ts`

Conclusion:

- This is reference-aligned, not a local defect.

## Reflection: what is still genuinely valuable

### 1. Docs metadata and ownership drift is real

The docs site still points at the old Kong repo and a remote Netlify-hosted
logo:

- `packages/site/docs/.vitepress/config.ts`
- `packages/site/docs/index.md`

This conflicts with the current project snapshot and package metadata, which now
use `https://github.com/Justineo/swrv-next`.

Why it matters:

- user-facing repository links are wrong
- docs branding depends on an external host even though local assets exist
- this is concrete drift, not stylistic preference

### 2. There is still a small amount of genuine dead or vestigial runtime surface

`packages/swrv/src/_internal/types.ts` still includes:

- `RevalidateEvent = "focus" | "reconnect" | "mutate" | "error-revalidate"`

But the SWRV runtime no longer uses a dedicated `"error-revalidate"` event path.
Unlike SWR, retry logic in `use-swrv-handler.ts` calls back into `revalidate()`
directly instead of dispatching an error revalidation event.

Why it matters:

- this is dead conceptual surface
- it makes internal types look broader than the implementation really is

### 3. Small helper duplication is real, even if minor

SWRV duplicates tiny helper logic such as `isPromiseLike` in:

- `packages/swrv/src/_internal/mutate.ts`
- `packages/swrv/src/_internal/preload.ts`

This is not a major architectural issue, but it is low-cost cleanup that
reduces incidental duplication.

### 4. `SWRVConfig` semantics are subtle enough to deserve clarification

The implementation intentionally mixes:

- one-time boundary decisions:
  - `client`
  - `provider`
  - event initializer attachment
- reactive request options:
  - fetcher
  - callbacks
  - visibility or online or pause behavior
  - refresh settings

This is not wrong. SWR also has a similar split between provider creation and
reactive config values. But in SWRV the behavior is easier to misunderstand
because the provider boundary is explicit and public through `createSWRVClient`.

Why it still matters:

- it affects contributor reasoning
- it affects how nested `SWRVConfig` should be used
- the best fix is documentation or code comments, not a runtime rewrite

## Recommendations after reflection

### Keep

#### P1. Fix docs-site ownership drift

Update:

- `packages/site/docs/.vitepress/config.ts`
- `packages/site/docs/index.md`

Specifically:

- replace `https://github.com/Kong/swrv` links with the current canonical repo
- stop depending on `https://docs-swrv.netlify.app/logo_45.png` when local
  assets already exist

#### P1. Remove the unused internal `"error-revalidate"` event concept

Update:

- `packages/swrv/src/_internal/types.ts`
- any adjacent internal code or tests that still model this event

This is the cleanest real runtime simplification still visible after comparison
with SWR.

#### P2. Deduplicate tiny internal helpers

Start with:

- `packages/swrv/src/_internal/mutate.ts`
- `packages/swrv/src/_internal/preload.ts`

This is low risk and removes small local duplication.

#### P2. Clarify `SWRVConfig` boundary semantics

Add a short maintainer-facing explanation in code comments or contributor docs
for:

- what changes reactively after mount
- what only applies when creating or binding a boundary

Relevant files:

- `packages/swrv/src/config-context.ts`
- `packages/swrv/src/config-utils.ts`

### Drop or downgrade

#### Drop: refactor the base hook just because it is large

SWR's base hook is also large. This is acceptable complexity.

#### Drop: rewrite `useSWRVInfinite` to reuse more of the base hook

SWR's infinite implementation also owns significant separate orchestration.

#### Drop: replace `SWRVClient` just because SWR uses a thinner tuple state

This remains a divergence, but it is not clearly harmful enough to justify a
large rewrite. The explicit client fits SWRV's public provider-scoped SSR and
hydration model.

#### Drop: treat cache-keyed side stores as suspicious

This is aligned with SWR's provider-scoped ownership.

#### Downgrade: `SWRVConfig` partial reactivity from refactor target to

documentation target

The behavior is subtle, but it is not obviously wrong or out of line with SWR.

## Revised conclusion

The codebase is healthier than the first-pass report suggested.

The most important correction from the reflection pass is this:

- much of the runtime complexity in SWRV is not accidental complexity
- it is either Vue-required complexity or complexity that SWR also carries in
  similar form

That means the highest-value work now is not large architectural churn.

The best remaining work is narrower:

1. fix docs and repository ownership drift
2. remove small dead or vestigial internal surface
3. do low-risk cleanup on duplicated helpers
4. document the subtle but intentional boundary semantics around `SWRVConfig`

## Validation context

From the prior repository analysis pass:

- `vp check`
- `vp test`

Both passed during the audit, with `24` test files and `221` tests passing.
