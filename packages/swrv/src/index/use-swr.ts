import { withArgs } from "../_internal/resolve-args";
import { useSWRVHandler } from "./use-swr-handler";
import { unstable_serialize } from "./serialize";

import type {
  BareFetcher,
  FetcherResponse,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
} from "../_internal/types";

type NonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;
type NullableKey<Key extends RawKey> = Key | null | undefined | false;

const useSWRVBase = withArgs(useSWRVHandler);

export { unstable_serialize };

export default function useSWRV<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  key: KeySource<Key>,
): SWRVResponse<Data, Error>;
export default function useSWRV<
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
export default function useSWRV<
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
export default function useSWRV<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher: BareFetcher<Data> | null | undefined,
  config: SWRVConfiguration<Data, Error, BareFetcher<Data>> & { fallbackData: Data },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (...args: [...Key]) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRV<Data = unknown, Error = unknown, Key extends string = string>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends Record<string, unknown> = Record<string, unknown>,
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<NullableKey<Key>>,
  fetcher: ((...args: [...Key]) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  key: KeySource<NullableKey<Key>>,
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher: BareFetcher<Data> | null | undefined,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (...args: [...Key]) => FetcherResponse<Data>>,
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown, Key extends string = string>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>>,
): SWRVResponse<Data, Error>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends Record<string, unknown> = Record<string, unknown>,
>(
  key: KeySource<NullableKey<Key>>,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>>,
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcherOrConfig?: BareFetcher<Data> | SWRVConfiguration<Data, Error> | null,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error> {
  return useSWRVBase(key, fetcherOrConfig, config);
}

export type SWRVHook = typeof useSWRV;
export type SWRHook = SWRVHook;
