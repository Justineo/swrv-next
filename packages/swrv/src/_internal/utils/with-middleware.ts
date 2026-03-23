import { normalize } from "./normalize-args";

import type {
  HookFetcher,
  InternalSWRVHook,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
  SWRVMiddleware,
} from "../types";

export type HookWithArgs = <Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  key: KeySource<Key>,
  fetcherOrConfig?: HookFetcher<Data> | SWRVConfiguration<Data, Error> | null,
  config?: SWRVConfiguration<Data, Error>,
) => SWRVResponse<Data, Error>;

export function applyMiddleware(
  hook: InternalSWRVHook,
  middlewares: readonly SWRVMiddleware[],
): InternalSWRVHook {
  let next = hook;

  for (let index = middlewares.length - 1; index >= 0; index -= 1) {
    next = middlewares[index](next);
  }

  return next;
}

export function withMiddleware<BaseHook extends HookWithArgs, NextHook>(
  useSWRV: BaseHook,
  middleware: (useSWRVNext: BaseHook) => NextHook,
): NextHook {
  return function useSWRVMiddleware<Data = unknown, Error = unknown>(
    key: KeySource<RawKey>,
    fetcherOrConfig?: HookFetcher<Data> | SWRVConfiguration<Data, Error> | null,
    config?: SWRVConfiguration<Data, Error>,
  ) {
    const [resolvedKey, fetcher, localConfig] = normalize<
      typeof key,
      Data,
      SWRVConfiguration<Data, Error>
    >([key, fetcherOrConfig, config]);
    const middlewareEntry: SWRVMiddleware = (useSWRVNext) =>
      middleware(useSWRVNext as BaseHook) as InternalSWRVHook;
    const use = [...(localConfig?.use ?? []), middlewareEntry];

    return useSWRV<Data, Error>(resolvedKey, fetcher, {
      ...localConfig,
      use,
    });
  } as NextHook;
}
