import useSWRV from "../use-swrv";
import { withMiddleware } from "../_internal";
import { normalizeHookArgs } from "../_internal/normalize";

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
  const [fetcher, normalizedConfig] = normalizeHookArgs(fetcherOrConfig, config);
  return useSWRVImmutableWithMiddleware(
    key,
    fetcher as BareFetcher<Data> | null | undefined,
    normalizedConfig,
  ) as SWRVResponse<Data, Error>;
}
