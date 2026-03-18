import useSWRV from "../use-swrv";

import type { BareFetcher, RawKey, SWRVConfiguration, SWRVResponse } from "../_internal/types";

export default function useSWRVImmutable<Data = unknown, Error = unknown>(
  key: RawKey | (() => RawKey),
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<Data = unknown, Error = unknown>(
  key: RawKey | (() => RawKey),
  fetcher: BareFetcher<Data> | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<Data = unknown, Error = unknown>(
  key: RawKey | (() => RawKey),
  fetcher?: BareFetcher<Data> | null,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error> {
  return useSWRV<Data, Error>(key, fetcher, {
    ...config,
    refreshInterval: 0,
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
}
