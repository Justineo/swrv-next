import { INFINITE_PREFIX } from "./constants";
import { invokeFetcher, serialize } from "./serialize";
import { isServerEnvironment } from "./env";
import { isPromiseLike } from "./shared";

import type {
  BareFetcher,
  Fetcher,
  FetcherResponse,
  KeySource,
  PreloadFunction,
  PreloadResponse,
  RawKey,
  SWRVConfiguration,
  SWRVMiddleware,
  SWRVClient,
  SWRVResponse,
} from "./types";

export function preload<Key extends RawKey = RawKey, Data = unknown>(
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
    preload(client, key, fetcher)) as PreloadFunction;
  client.state.helpers.preload = next;
  return next;
}

export const middleware: SWRVMiddleware = (useSWRVNext) => {
  return function useSWRVPreload<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
    key: KeySource<Key>,
    fetcher?: BareFetcher<Data> | null,
    config?: SWRVConfiguration<Data, Error>,
  ): SWRVResponse<Data, Error> {
    const nextFetcher =
      fetcher &&
      ((...args: readonly unknown[]) => {
        const [serializedKey] = serialize(key);
        const client = config?.client;

        if (!serializedKey || serializedKey.startsWith(INFINITE_PREFIX) || !client) {
          return fetcher(...args);
        }

        const request = client.consumePreload(serializedKey);
        return request === undefined ? fetcher(...args) : request;
      });

    return useSWRVNext(key, nextFetcher as BareFetcher<Data> | null | undefined, config);
  };
};
