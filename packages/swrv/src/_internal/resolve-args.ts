import { getBuiltInMiddleware } from "./middleware-preset";
import { normalize } from "./normalize-args";
import { useSWRConfig } from "./use-swr-config";
import { applyMiddleware } from "./with-middleware";

import type {
  HookFetcher,
  InternalSWRVHook,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
} from "./types";

type HookWithArgs = <Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  key: KeySource<Key>,
  fetcherOrConfig?: HookFetcher<Data> | SWRVConfiguration<Data, Error> | null,
  config?: SWRVConfiguration<Data, Error>,
) => SWRVResponse<Data, Error>;

export function withArgs(hook: InternalSWRVHook): HookWithArgs {
  return function useSWRVWithArgs<Data = unknown, Error = unknown>(
    key: KeySource<RawKey>,
    fetcherOrConfig?: HookFetcher<Data> | SWRVConfiguration<Data, Error> | null,
    config?: SWRVConfiguration<Data, Error>,
  ) {
    const fallbackConfig = useSWRConfig();
    const [resolvedKey, fetcher, localConfig] = normalize<
      typeof key,
      Data,
      SWRVConfiguration<Data, Error>
    >([key, fetcherOrConfig, config]);
    const middlewares = fallbackConfig.use
      .concat(localConfig?.use ?? [])
      .concat(getBuiltInMiddleware());
    const next = middlewares.length === 0 ? hook : applyMiddleware(hook, middlewares);
    const hookConfig = {
      ...localConfig,
      cache: fallbackConfig.cache,
      client: fallbackConfig.client,
    } satisfies SWRVConfiguration<Data, Error>;

    return next<Data, Error>(resolvedKey, (fetcher ?? null) as HookFetcher<Data>, hookConfig);
  };
}
