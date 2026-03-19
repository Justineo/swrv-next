import type { SWRVClient, SWRVFallbackSnapshot } from "./types";

export function serializeSWRVSnapshot(client: SWRVClient): SWRVFallbackSnapshot {
  const snapshot: SWRVFallbackSnapshot = {};

  for (const key of client.cache.keys()) {
    const state = client.getState(key);
    if (state?.data !== undefined) {
      snapshot[key] = state.data;
    }
  }

  return snapshot;
}

export function hydrateSWRVSnapshot(
  client: SWRVClient,
  snapshot: SWRVFallbackSnapshot,
): SWRVClient {
  for (const [key, data] of Object.entries(snapshot)) {
    client.setState(
      key,
      {
        data,
        error: undefined,
        isLoading: false,
        isValidating: false,
      },
      0,
    );
  }

  return client;
}
