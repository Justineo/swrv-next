import { invokeFetcher, serialize } from "./serialize";
import { isServerEnvironment } from "./env";

import type {
  BareFetcher,
  Fetcher,
  FetcherResponse,
  KeySource,
  PreloadFunction,
  PreloadResponse,
  RawKey,
  SWRVClient,
} from "./types";

function isPromiseLike<Data>(value: unknown): value is Promise<Data> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Promise<Data>).then === "function"
  );
}

export function preloadKey<Key extends RawKey = RawKey, Data = unknown>(
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
    return invokeFetcher(typedFetcher, rawKey) as PreloadResponse<Data>;
  }

  let invoked = false;
  let response: FetcherResponse<Data> | undefined;
  const tracked = client.preload<Data>(serializedKey, () => {
    invoked = true;
    response = invokeFetcher(typedFetcher, rawKey) as FetcherResponse<Data>;
    return Promise.resolve(response);
  });

  if (!invoked) {
    return tracked;
  }

  return isPromiseLike(response) ? tracked : (response as Data);
}

export function getScopedPreload(client: SWRVClient): PreloadFunction {
  const current = client.state.helpers.preload;
  if (current) {
    return current;
  }

  const next = ((key: KeySource<RawKey>, fetcher: Fetcher<unknown, RawKey>) =>
    preloadKey(client, key, fetcher)) as PreloadFunction;
  client.state.helpers.preload = next;
  return next;
}
