import { callFetcher, serialize } from "./serialize";
import { isServerEnvironment } from "./env";

import type { BareFetcher, Fetcher, KeySource, PreloadResponse, RawKey, SWRVClient } from "./types";

export function preloadKey<Data = unknown, Key extends RawKey = RawKey>(
  client: SWRVClient,
  key: KeySource<Key>,
  fetcher: Fetcher<Data, Key>,
): PreloadResponse<Data> {
  if (isServerEnvironment()) {
    return undefined;
  }

  const [serializedKey, rawKey] = serialize(key);
  const typedFetcher = fetcher as BareFetcher<Data>;

  if (!serializedKey) {
    return callFetcher(typedFetcher, rawKey);
  }

  return client.preload(serializedKey, () => callFetcher(typedFetcher, rawKey));
}
