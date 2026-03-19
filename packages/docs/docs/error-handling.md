---
title: Error handling
description: Handle errors when fetching data with SWRV.
---

# Error handling

If the fetcher throws, the error is exposed through `error`:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch the user.");
  }
  return response.json();
};

const { data, error } = useSWRV("/api/user", fetcher);
</script>
```

## Status code and error object

Sometimes you need the parsed error payload and the HTTP status code:

```ts
const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the data.") as Error & {
      info?: unknown;
      status?: number;
    };
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }

  return response.json();
};
```

This is useful because `data` and `error` can exist at the same time. A revalidation may fail while
the last successful data value is still available in the UI.

## Error retry

SWRV retries errors by default. You can disable or customize the behavior with:

- `shouldRetryOnError`
- `errorRetryCount`
- `errorRetryInterval`
- `onErrorRetry`

```vue
<script setup lang="ts">
import useSWRV from "swrv";

useSWRV("/api/user", fetcher, {
  onErrorRetry(error, key, _config, revalidate, { retryCount }) {
    const typedError = error as Error & { status?: number };

    if (typedError.status === 404) {
      return;
    }

    if (retryCount >= 3) {
      return;
    }

    setTimeout(() => {
      void revalidate({ retryCount });
    }, 5000);
  },
});
</script>
```

## Global error report

If you want a single place to report errors, register `onError` through `SWRVConfig`:

```vue
<script setup lang="ts">
import { SWRVConfig } from "swrv";

const value = {
  onError(error: Error & { status?: number }, key: string) {
    if (error.status !== 403 && error.status !== 404) {
      console.error("Report this error", key, error);
    }
  },
};
</script>

<template>
  <SWRVConfig :value="value">
    <App />
  </SWRVConfig>
</template>
```

Use hook-level `onError` when the effect is local to one request, and config-level `onError` when
you want one shared reporting path for a whole subtree.
