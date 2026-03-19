import { useSWRVContext } from "../config";
import { getDevtoolsUse } from "./devtools";
import { normalize } from "./normalize-args";
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
    const context = useSWRVContext();
    const [resolvedKey, fetcher, localConfig] = normalize<
      typeof key,
      Data,
      SWRVConfiguration<Data, Error>
    >([key, fetcherOrConfig, config]);
    const middlewares = getDevtoolsUse().concat(context.config.value.use, localConfig?.use ?? []);

    if (middlewares.length === 0) {
      return hook<Data, Error>(resolvedKey, fetcher, localConfig);
    }

    return applyMiddleware(hook, middlewares)<Data, Error>(resolvedKey, fetcher, localConfig);
  };
}
