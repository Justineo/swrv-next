import { useSWRVContext } from "./config";
import { applyMiddleware, resolveMiddlewareStack } from "./_internal/middleware-stack";
import { normalizeHookArgs } from "./_internal/normalize";
import { useSWRVHandler, unstable_serialize } from "./use-swrv-handler";

import type {
  BareFetcher,
  FetcherResponse,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVHook,
  SWRVResponse,
} from "./_internal/types";

type NonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;
type NullableKey<Key extends RawKey> = Key | null | undefined | false;

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
  fetcher: ((...args: [...Key]) => FetcherResponse<Data>) | null | undefined | false,
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
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined | false,
  config: SWRVConfiguration<Data, Error, (arg: Key) => FetcherResponse<Data>> & {
    fallbackData: Data;
  },
): SWRVResponse<Data, Error, { fallbackData: Data }>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher: BareFetcher<Data> | null | undefined | false,
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
  fetcher: ((...args: [...Key]) => FetcherResponse<Data>) | null | undefined | false,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  key: KeySource<NullableKey<Key>>,
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined | false,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error>;
export default function useSWRV<Data = unknown, Error = unknown>(
  key: KeySource<RawKey>,
  fetcher: BareFetcher<Data> | null | undefined | false,
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
  fetcherOrConfig?: BareFetcher<Data> | SWRVConfiguration<Data, Error> | null | false,
  config?: SWRVConfiguration<Data, Error>,
): SWRVResponse<Data, Error> {
  const [fetcher, normalizedConfig] = normalizeHookArgs(fetcherOrConfig, config);
  const context = useSWRVContext();
  const middlewares = resolveMiddlewareStack(context.config.value, normalizedConfig);

  if (middlewares.length === 0) {
    return useSWRVHandler(key, fetcher, normalizedConfig);
  }

  const next = applyMiddleware(useSWRVHandler as SWRVHook, middlewares);
  return next(key, fetcher, normalizedConfig);
}
