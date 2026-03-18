import { callFetcher, serialize } from "./serialize";

import type { BareFetcher, Fetcher, KeySource, RawKey, SWRVClient } from "./types";

export function preloadKey<Data = unknown, Key extends RawKey = RawKey>(
  client: SWRVClient,
  key: KeySource<Key>,
  fetcher: Fetcher<Data, Key>,
): Promise<Data> {
  const [serializedKey, rawKey] = serialize(key);
  const typedFetcher = fetcher as BareFetcher<Data>;

  if (!serializedKey) {
    return callFetcher(typedFetcher, rawKey);
  }

  return client.preload(serializedKey, () => callFetcher(typedFetcher, rawKey));
}
