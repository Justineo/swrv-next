# Cache

SWRV uses a provider-scoped cache model. Each client owns its cache, listeners, dedupe records, and preload records.

## The default cache

`createSWRVClient()` creates the default in-memory cache domain.

```ts
import { createSWRVClient } from "swrv";

const client = createSWRVClient();
```

## Create a boundary

Provide a client with `SWRVConfig`.

```vue
<SWRVConfig :value="{ client }">
  <App />
</SWRVConfig>
```

This is the normal way to:

- isolate tests
- isolate embedded apps
- isolate one SSR request from another

## Extend the parent cache

`provider` receives the parent cache. That makes it possible to layer a custom cache view or adapter without losing the inherited cache boundary by default.

## Avoid direct cache writes

Although the cache is exposed through `useSWRVConfig()`, direct writes are still not the recommended path. Prefer:

- `mutate`
- `useSWRVMutation`
- `preload`
- config `fallback`

Those routes preserve the normal loading, validating, and listener behavior.
