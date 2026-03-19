import useSWRV from "../index/use-swrv";
import { withMiddleware } from "../_internal/with-middleware";

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
type NullableKey<Key extends RawKey> = Key | null | undefined | false;

export const immutable: SWRVMiddleware = (useSWRVNext) => (key, fetcher, config) => {
  const normalizedConfig = config && typeof config === "object" ? config : {};

  return useSWRVNext(key, fetcher, {
    ...normalizedConfig,
    refreshInterval: 0,
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

const useSWRVImmutableBase = withMiddleware(useSWRV, immutable);

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
  key: KeySource<NullableKey<Key>>,
  fetcher: ((...args: [...Key]) => FetcherResponse<Data>) | null | undefined,
  config: SWRVConfiguration<Data, Error, (...args: [...Key]) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  key: KeySource<NullableKey<Key>>,
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (...args: [...Key]) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends string = string,
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends Record<string, unknown> = Record<string, unknown>,
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<NullableKey<Key>>,
  fetcher: ((...args: [...Key]) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  key: KeySource<NullableKey<Key>>,
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (...args: [...Key]) => FetcherResponse<Data>>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends string = string,
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<
  Data = unknown,
  Error = unknown,
  Key extends Record<string, unknown> = Record<string, unknown>,
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>>,
): SWRVResponse<Data, Error>;
export default function useSWRVImmutable<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcherOrConfig?:
    | ((...args: readonly unknown[]) => FetcherResponse<Data>)
    | SWRVConfiguration<Data, Error>
    | null
    | false,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error> {
  return useSWRVImmutableBase(
    key,
    fetcherOrConfig as BareFetcher<Data> | null | false,
    config,
  ) as SWRVResponse<Data, Error>;
}
