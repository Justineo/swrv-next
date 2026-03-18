# Examples

## Basic Request

```ts
import useSWRV from "swrv";

type User = {
  id: string;
  name: string;
};

const { data, error, isLoading, isValidating, mutate } = useSWRV<User>("/api/user", async (key) => {
  const response = await fetch(key);
  if (!response.ok) {
    throw new Error("Failed to load the current user.");
  }
  return response.json();
});
```

## Scoped Client

Use `SWRVConfig` when you need an explicit cache boundary, for example in SSR or when embedding multiple apps on the same page.

```ts
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
```

```vue
<script setup lang="ts">
import { SWRVConfig, createSWRVClient } from "swrv";

const client = createSWRVClient();
</script>

<template>
  <SWRVConfig :value="{ client, dedupingInterval: 1500 }">
    <AppShell />
  </SWRVConfig>
</template>
```

## Config Fallback

```vue
<script setup lang="ts">
import { SWRVConfig, unstable_serialize } from "swrv";

const fallback = {
  "/api/user": { id: "1", name: "Ada" },
  [unstable_serialize(() => ["/api/team", 7] as const)]: { id: 7, name: "Platform" },
};
</script>

<template>
  <SWRVConfig :value="{ fallback }">
    <AppShell />
  </SWRVConfig>
</template>
```

## Optimistic Mutation

```ts
import { mutate } from "swrv";

type User = {
  id: string;
  name: string;
};

async function renameUser(nextName: string) {
  await mutate<User>(
    "/api/user",
    fetch("/api/user", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    }).then((response) => response.json()),
    {
      optimisticData: (current) =>
        current ? { ...current, name: nextName } : { id: "pending", name: nextName },
      rollbackOnError: true,
      revalidate: false,
    },
  );
}
```

## Remote Mutation Hook

```ts
import useSWRVMutation from "swrv/mutation";

const { trigger, data, error, isMutating, reset } = useSWRVMutation(
  "/api/user",
  async (key, { arg }: { arg: { name: string } }) => {
    const response = await fetch(key, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(arg),
    });

    if (!response.ok) {
      throw new Error("Failed to update the user.");
    }

    return response.json();
  },
);

await trigger(
  { name: "Ada" },
  {
    populateCache: true,
    revalidate: false,
  },
);
```

## Infinite Loading

```ts
import useSWRVInfinite from "swrv/infinite";

type Project = {
  id: string;
  name: string;
};

const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRVInfinite<Project[]>(
  (index, previousPage) => {
    if (index === 0) {
      return "/api/projects";
    }

    if (!previousPage?.length) {
      return null;
    }

    const cursor = previousPage[previousPage.length - 1].id;
    return `/api/projects?cursor=${cursor}`;
  },
  async (key) => {
    const response = await fetch(key);
    return response.json();
  },
  { initialSize: 2 },
);

await setSize(size.value + 1);
await mutate();
```

## Subscription

```ts
import useSWRVSubscription from "swrv/subscription";

const { data, error } = useSWRVSubscription(
  "/api/notifications",
  (key, { next }) => {
    const socket = new WebSocket(`wss://example.test/live?channel=${encodeURIComponent(key)}`);

    socket.addEventListener("message", (event) => {
      next(undefined, JSON.parse(event.data));
    });

    socket.addEventListener("error", () => {
      next(new Error("Subscription connection failed."));
    });

    return () => {
      socket.close();
    };
  },
  { fallbackData: [] },
);
```
