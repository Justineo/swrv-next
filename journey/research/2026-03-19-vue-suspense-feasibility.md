# Vue Suspense Feasibility For SWRV

Date: 2026-03-19

## Question

Can `swrv-next` implement SWR-style `suspense: true` behavior with the current
composable API shape?

## Probe Summary

Three direct probes were run against Vue 3 runtime behavior in the local
workspace:

1. A synchronous `setup()` assigned `instance.asyncDep` manually.
2. A render function threw a promise.
3. A mounted component assigned `instance.asyncDep` during an update.

## Findings

### 1. Mount-time suspension is viable

If a synchronous `setup()` assigns `instance.asyncDep` before the initial mount
finishes, Vue Suspense will:

- render the fallback
- wait for the promise
- continue mounting the component once the promise resolves

That means `useSWRV(..., { suspense: true })` is technically implementable for
the initial activation path without requiring users to write `async setup()`.

### 2. Render-thrown promises do not integrate with Vue Suspense the way React does

Throwing a promise from render did **not** register as a Suspense dependency in
the probe. It surfaced as a normal error instead.

Implication:

- React-style “throw promise while rendering” is not a viable SWRV strategy for
  Vue.

### 3. Re-suspending after mount is not supported by the same mechanism

Assigning `instance.asyncDep` during a later update did not cause the already
mounted component to re-enter the Suspense fallback.

Implication:

- mount-time suspension is feasible
- update-time/key-change suspension is **not** achievable with the same simple
  mechanism
- exact SWR suspense parity for key changes would require a deeper and riskier
  Vue-internal strategy, or a different public API shape

## Practical Conclusion

There are two realistic paths:

1. Limited `2.0` suspense support.
   Implement `suspense: true` for initial mount only, plus the obvious static
   cases like cached data and fallback data. Document that later key changes do
   not re-enter Suspense fallback automatically.

2. Fuller Suspense parity via deeper Vue-internal work.
   Attempt a more invasive implementation that coordinates with Vue internals
   beyond `instance.asyncDep`. This is higher risk, less maintainable, and more
   likely to break across Vue minors.

## Recommendation

Treat full SWR suspense parity as a product decision, not a routine coding task.

The initial-mount subset is implementable. Exact SWR behavior around later key
changes, repeated fallback entry, and some promise-driven cases is not cleanly
available through the same mechanism in Vue.
