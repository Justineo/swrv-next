# Research: SWR Dependency Collection and Its Implications for `swrv-next`

Date: 2026-03-18

## Purpose

This note examines SWR's "dependency collection" mechanism and answers two questions:

1. What work is SWR doing there, and why?
2. Does `swrv-next` need anything similar, or are we doing unnecessary work because of React-shaped assumptions?

Primary references:

- SWR performance docs: [Dependency Collection](https://swr.vercel.app/docs/advanced/performance#dependency-collection)
- SWR source:
  - `https://github.com/vercel/swr/blob/5fa29522f196db2ad9d2083193c3b63214256c19/src/index/use-swr.ts#L184-L203`
  - `https://github.com/vercel/swr/blob/5fa29522f196db2ad9d2083193c3b63214256c19/src/index/use-swr.ts#L252-L268`
  - `https://github.com/vercel/swr/blob/5fa29522f196db2ad9d2083193c3b63214256c19/src/index/use-swr.ts#L812-L832`
- Local source mirrors used for close reading:
  - [use-swr.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts)
  - [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts)
  - [client.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/client.ts)
  - Vue reactivity internals:
    - [reactivity.esm-bundler.js](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/node_modules/.pnpm/@vue+reactivity@3.5.30/node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js)
    - [shared.esm-bundler.js](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/node_modules/.pnpm/@vue+shared@3.5.30/node_modules/@vue/shared/dist/shared.esm-bundler.js)

## Short Answer

SWR's dependency collection is a React-specific optimization for avoiding re-renders when only some fields from the returned SWR response are used.

`swrv-next` does not currently implement that mechanism, and it should not. Vue's ref-level dependency tracking already gives us the core benefit naturally.

The good news is that `swrv-next` is not carrying the same React-specific complexity. The real follow-up is smaller: there are a couple of update-path inefficiencies in `swrv-next`, but they are not "dependency collection" and they are much narrower.

## What SWR's Dependency Collection Actually Does

The official docs describe the feature directly: `useSWR` returns 4 stateful values, and each one can update independently. The point of dependency collection is that if a component only uses `data`, changes in `error`, `isLoading`, or `isValidating` should not force the component to re-render.

In the source, that works like this:

1. SWR creates a mutable `stateDependencies` object.
   Source: [use-swr.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts#L174)

2. The returned `swrResponse` does not expose plain fields. It exposes getters.
   Each getter marks the field as used:
   - `data` sets `stateDependencies.data = true`
   - `error` sets `stateDependencies.error = true`
   - `isValidating` sets `stateDependencies.isValidating = true`
   - `isLoading` sets `stateDependencies.isLoading = true`
     Source: [use-swr.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts#L812-L829)

3. When cache state changes, SWR compares only the fields that were actually read.
   The `isEqual` function loops only over `stateDependencies`.
   Source: [use-swr.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts#L184-L203)

4. If only unread fields changed, SWR reuses the previous snapshot object to avoid a React re-render.
   It still mutates the memorized snapshot so untracked fields stay current for future reads.
   Source: [use-swr.ts](/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src/index/use-swr.ts#L252-L268)

This is clever, but it exists because React components re-render from hook state identity changes, and SWR returns one response object containing multiple pieces of state.

## Why Vue Does Not Need the Same Mechanism

`swrv-next` returns separate Vue refs:

- `data: Ref<Data | undefined>`
- `error: Ref<Error | undefined>`
- `isLoading: Ref<boolean>`
- `isValidating: Ref<boolean>`

Source: [types.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/types.ts#L196-L202)

In `useSWRV`, those refs are created independently:

- `const data = ref(...)`
- `const error = ref(...)`
- `const isLoading = ref(false)`
- `const isValidating = ref(false)`

Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L121-L124)

That means Vue already tracks dependency usage at the ref level.

If a component only reads `data.value`, then changes to `error.value` do not invalidate that dependency. We do not need getter-based field usage tracking on top of that.

There is another helpful detail in Vue's reactivity implementation: ref assignments only trigger when the value actually changes by `Object.is`.

- Vue shared `hasChanged`: `!Object.is(value, oldValue)`
  Source: [shared.esm-bundler.js](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/node_modules/.pnpm/@vue+shared@3.5.30/node_modules/@vue/shared/dist/shared.esm-bundler.js#L82)
- ref setter checks `hasChanged(newValue, oldValue)` before triggering
  Source: [reactivity.esm-bundler.js](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/node_modules/.pnpm/@vue+reactivity@3.5.30/node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js#L1513-L1519)

So even though `useSWRV` writes all four refs in `applyState()`, unchanged primitive values and preserved object identities do not trigger Vue updates.

## What `swrv-next` Is Already Doing Right

### 1. We are not porting SWR's dependency collector

There is no equivalent of:

- `stateDependencies`
- getter-based usage tracking
- snapshot memoization
- "only compare accessed fields"
- direct mutation of a memorized response object to keep untracked fields fresh

This is correct. That machinery solves a React problem we do not have in the same form.

### 2. We still preserve `data` identity when it matters

On successful fetch completion, `swrv-next` uses `config.compare` to keep the previous `data` reference when the new result is considered equal:

- `data: configValue.compare(latestData, resolvedData) ? latestData : resolvedData`

Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L347-L358)

This is still useful in Vue. If a fetcher returns a new object that is semantically equal, preserving the old reference avoids unnecessary invalidation of `data` consumers.

So the correct conclusion is not "Vue makes all equality work unnecessary." The correct conclusion is narrower:

- Vue makes SWR's getter-based dependency collection unnecessary
- Vue does not make data identity preservation unnecessary

## Unnecessary or Avoidable Work Found in `swrv-next`

These are the real cleanup candidates.

### 1. Duplicate `applyState()` after synchronous `setState()` notifications

`client.setState()` notifies listeners synchronously:

- `cache.set(key, next);`
- `notifyListeners(key, next, previous);`

Source: [client.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/client.ts#L69-L91)

`useSWRV` subscribes like this:

- `client.subscribe(serializedKey, () => { applyState(); })`

Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L512-L514)

But in several places, `useSWRV` also calls `applyState()` immediately after `client.setState(...)`:

- loading state write
- paused fetch completion
- successful fetch completion
- paused error completion
- error completion

Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L286-L287)
Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L327-L329)
Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L359-L364)
Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L379-L381)
Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L394-L395)

Once the hook is subscribed for the active key, those direct calls duplicate the listener-driven sync path:

- one cache write
- one synchronous listener callback
- one extra cache read in `applyState()`
- one extra batch of ref assignments

Because Vue ignores same-value ref writes, this is not as bad as a React re-render. But it is still unnecessary work on hot paths.

Recommendation:

- either rely on the subscription callback after `setState()` for the active key
- or update refs directly in the local code path and let the subscription callback become a pure external-change path

The current code mixes both approaches.

### 2. `watch(() => serialize(...))` returns a fresh array every time

`useSWRV` watches:

- `() => serialize(key as RawKey | (() => RawKey))`

Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L489-L490)

`useSWRVSubscription` watches:

- `() => serialize(key as KeySource<Key>)`

Source: [subscription/index.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/subscription/index.ts#L67-L68)

Vue watch compares the getter result with `hasChanged(...)` when it is not in multi-source mode.
That means a freshly allocated array is always considered changed by identity, even if the serialized key string is the same.

Relevant Vue watch comparison path:

- `hasChanged(newValue, oldValue)`

Source: [reactivity.esm-bundler.js](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/node_modules/.pnpm/@vue+reactivity@3.5.30/node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js#L1892-L1894)

Implication:

- if the key source's reactive dependencies invalidate, and `serialize(...)` returns the same logical key, the watch callback still runs because the returned array is a new object
- that means extra timer resets, unsubscribe/resubscribe work, and activation logic, even when the effective key did not change

This is a more Vue-specific cleanup target than anything in SWR's dependency collector.

Recommendation:

- watch a stable serialized key string instead of the tuple object
- or split the watch source so equality is based on stable primitives
- or guard early inside the callback when the serialized key and raw key are effectively unchanged

### 3. Subscription callback ignores the listener payload and re-reads cache

`client.subscribe` passes `current` and `previous` state to listeners:

- `listener(current, previous)`

Source: [client.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/_internal/client.ts#L35-L49)

But `useSWRV` subscribes with:

- `() => { applyState(); }`

Source: [use-swrv.ts](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv/src/use-swrv.ts#L512-L514)

So every state notification triggers another `client.getState(...)` lookup inside `applyState()`.

This is not a major problem, because `applyState()` also merges fallback logic. But it is still extra work that the current listener payload could partially avoid.

Recommendation:

- consider an `applyStateFromEntry(entry)` helper for subscription-driven updates
- keep the full `applyState()` path only when fallback resolution or key re-resolution is actually needed

## What We Should Not Do

We should not try to port SWR's dependency collector literally into Vue.

That would add complexity without solving the same underlying problem:

- Vue already tracks individual refs
- same-value ref writes are already suppressed
- the public `SWRVResponse` shape is already field-split rather than object-snapshot-driven

If we copied SWR's getter-based response object design into Vue, we would likely make the code harder to reason about while gaining little or nothing.

## Recommended Direction

### Keep

- separate refs for `data`, `error`, `isLoading`, and `isValidating`
- `compare`-based data identity preservation
- provider-scoped cache and subscription model

### Clean Up

1. Remove duplicate post-`setState()` `applyState()` calls where listener notification already covers the active hook.
2. Replace `watch(() => serialize(...))` tuple sources with stable watch keys or explicit equality guards.
3. Consider using subscription listener payloads to avoid redundant cache reads.

## Final Conclusion

The dependency-collection mechanism in SWR is real, deliberate, and useful, but it is solving a React rendering problem.

`swrv-next` does not need that mechanism, and it is correct that we do not currently implement it.

The performance work that still makes sense in `swrv-next` is smaller and more local:

- reduce redundant cache-to-ref synchronization
- avoid watch sources that allocate fresh tuple objects
- keep identity-preserving updates where they matter for `data`

So the answer to the original question is:

- SWR's dependency collection should be treated as reference material for understanding React-specific tradeoffs
- it should not be treated as a parity feature that Vue must copy
- `swrv-next` does have a few real cleanup opportunities, but they are different from SWR's dependency collection
