---
title: Conditional fetching
description: Conditionally fetch data based on reactive dependencies or user state.
---

# Conditional fetching

Use `null`, `false`, or a function key to tell SWRV when a request should start.

## Conditional

Use a falsy key when the request should not run yet:

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import useSWRV from "swrv";

const shouldFetch = ref(false);
const key = computed(() => (shouldFetch.value ? "/api/user" : null));

const { data } = useSWRV(key, fetcher);
</script>
```

You can also pass the function directly:

```vue
<script setup lang="ts">
import { ref } from "vue";
import useSWRV from "swrv";

const shouldFetch = ref(false);
const { data } = useSWRV(() => (shouldFetch.value ? "/api/user" : null), fetcher);
</script>
```

If the key resolves to `null`, `undefined`, `false`, or an empty array, SWRV does not start the
request.

## Dependent

Function keys are especially useful when one request depends on another:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const user = useSWRV("/api/user", fetcher);
const projects = useSWRV(
  () => (user.data.value ? `/api/projects?uid=${user.data.value.id}` : null),
  fetcher,
);
</script>
```

This lets SWRV fetch with the maximum possible parallelism. If the second key cannot be resolved
yet, SWRV waits without starting a broken request or caching under the wrong key.

If a function key throws, SWRV also treats it as “not ready yet”:

```vue
<script setup lang="ts">
import useSWRV from "swrv";

const user = useSWRV("/api/user", fetcher);
const projects = useSWRV(() => `/api/projects?uid=${user.data.value!.id}`, fetcher);
</script>
```

In practice, a direct conditional expression is usually easier to read than relying on a throw, but
both patterns work.
