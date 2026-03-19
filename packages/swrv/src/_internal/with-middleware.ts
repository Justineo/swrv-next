import { normalizeArgs } from "./normalize-args";

import type {
  HookFetcher,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVHook,
  SWRVHookWithArgs,
  SWRVMiddleware,
} from "./types";

export function applyMiddleware(hook: SWRVHook, middlewares: readonly SWRVMiddleware[]): SWRVHook {
  let next = hook;

  for (let index = middlewares.length - 1; index >= 0; index -= 1) {
    next = middlewares[index](next);
  }

  return next;
}

export function withMiddleware(
  useSWRV: SWRVHookWithArgs,
  middleware: SWRVMiddleware,
): SWRVHookWithArgs {
  return function useSWRVMiddleware<Data = unknown, Error = unknown>(
    key: KeySource<RawKey>,
    fetcherOrConfig?: HookFetcher<Data> | SWRVConfiguration<Data, Error> | null | false,
    config?: SWRVConfiguration<Data, Error>,
  ) {
    const [resolvedKey, fetcher, localConfig] = normalizeArgs<
      typeof key,
      Data,
      SWRVConfiguration<Data, Error>
    >([key, fetcherOrConfig, config]);
    const use = (localConfig?.use ?? []).concat(middleware);

    return useSWRV<Data, Error>(resolvedKey, fetcher, {
      ...localConfig,
      use,
    });
  };
}
