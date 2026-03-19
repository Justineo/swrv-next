# Automatic revalidation

SWRV follows SWR's focus, reconnect, and polling model, while exposing Vue-friendly controls.

## Revalidate on mount

`revalidateOnMount` controls the initial activation only.

```ts
useSWRV("/api/user", fetcher, {
  revalidateOnMount: false,
});
```

Later key changes still follow normal stale-data rules.

## Revalidate on focus

Window focus and document visibility changes revalidate by default.

```ts
useSWRV("/api/user", fetcher, {
  revalidateOnFocus: false,
});
```

Use `focusThrottleInterval` to limit how often focus events can revalidate the same hook.

## Revalidate on reconnect

Browser reconnect revalidation is also enabled by default.

```ts
useSWRV("/api/user", fetcher, {
  revalidateOnReconnect: false,
});
```

## Poll with refreshInterval

```ts
useSWRV("/api/metrics", fetcher, {
  refreshInterval: 5000,
});
```

`refreshInterval` can also be a function of the latest data.

```ts
refreshInterval: (latest) => (latest?.busy ? 1000 : 5000);
```

## Gate activity

Use these options to control whether revalidation should run:

- `isPaused`
- `isVisible`
- `isOnline`
- `refreshWhenHidden`
- `refreshWhenOffline`

This is also where custom focus and reconnect behavior can be injected for non-browser runtimes through `initFocus` and `initReconnect`.
