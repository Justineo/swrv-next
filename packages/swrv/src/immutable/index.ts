import useSWRV from "../use-swrv";
import { withMiddleware } from "../_internal";

import type {
  BareFetcher,
  FetcherResponse,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVMiddleware,
  SWRVResponse,
} from "../_internal/types";

type NonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;

export const immutable: SWRVMiddleware =
  (useSWRVNext) =>
  (key, fetcher, config = {}) =>
    useSWRVNext(key, fetcher, {
      ...config,
      refreshInterval: 0,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    });

const useSWRVImmutableWithMiddleware = withMiddleware(useSWRV, immutable);

export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(key: KeySource<Key>): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<Key>,
  fetcher: ((...args: Key) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  key: KeySource<Key>,
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher?: ((...args: readonly unknown[]) => FetcherResponse<Data>) | null,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error> {
  return useSWRVImmutableWithMiddleware(
    key,
    fetcher as BareFetcher<Data> | null | undefined,
    config,
  ) as SWRVResponse<Data, Error>;
}
