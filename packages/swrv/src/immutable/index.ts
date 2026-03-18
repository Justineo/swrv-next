import useSWRV from "../use-swrv";

import type {
  BareFetcher,
  FetcherResponse,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
} from "../_internal/types";

type NonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;

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
  return useSWRV(key as KeySource<RawKey>, fetcher as BareFetcher<Data> | null | undefined, {
    ...config,
    refreshInterval: 0,
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  }) as SWRVResponse<Data, Error>;
}
