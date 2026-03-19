---
title: Revalidation
description: Control automatic revalidation in SWRV.
---

# Revalidation

SWRV revalidates data automatically on focus, reconnect, and interval updates by default.

## Revalidate on focus

When the window regains focus, SWRV revalidates active keys:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

useSWRV("/api/user", fetcher, {
  revalidateOnFocus: true,
});
</script>
```

Disable it with `revalidateOnFocus: false` or throttle it with `focusThrottleInterval`.

If you need to override how focus is detected, see [Global configuration](/global-configuration) for
`initFocus()`.

## Revalidate on interval

Polling is controlled by `refreshInterval`:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

useSWRV("/api/metrics", fetcher, {
  refreshInterval: 5000,
});
</script>
```

`refreshInterval` can also be a function of the latest data:

```ts
const options = {
  refreshInterval: (latest?: { busy?: boolean }) => (latest?.busy ? 1000 : 5000),
};
```

By default, SWRV does not poll when the page is hidden or offline. Use `refreshWhenHidden` and
`refreshWhenOffline` if you need to opt into those cases.

## Revalidate on reconnect

SWRV also revalidates when the browser regains network connectivity:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

useSWRV("/api/user", fetcher, {
  revalidateOnReconnect: false,
});
</script>
```

## Disable automatic revalidations

Some resources should never be revalidated automatically after the first load. For those cases, use
`swrv/immutable`:

```vue
<script setup lang="ts">
import useSWRVImmutable from "swrv/immutable";

const { data } = useSWRVImmutable("/api/build-metadata", fetcher);
</script>
```

This disables stale revalidation, focus revalidation, reconnect revalidation, and polling.

See [API](/api#swrvimmutable) for the immutable entry point shape.

You can also disable each behavior individually with `revalidateOnFocus`, `revalidateOnReconnect`,
or `refreshInterval: 0`.

## Revalidate on mount

`revalidateOnMount` controls the first activation only:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

useSWRV("/api/user", fetcher, {
  revalidateOnMount: false,
});
</script>
```

If it is undefined, SWRV falls back to the normal stale-data rule: fetch when there is no data yet,
or when stale data should be revalidated.

## Activity gates

SWRV also supports lower-level gates for non-standard environments:

- `isPaused()`
- `isVisible()`
- `isOnline()`
- `initFocus()`
- `initReconnect()`

These are most useful when you need to adapt SWRV to a custom host environment rather than the
default browser behavior. They are configured through [SWRVConfig](/global-configuration).
