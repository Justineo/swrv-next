import type { SWRVHook, SWRVMiddleware } from "./types";

export const withMiddleware = (useSWRV: SWRVHook, middleware: SWRVMiddleware): SWRVHook => {
  return ((key, fetcher, config) => {
    const use = (config?.use ?? []).concat(middleware);
    return useSWRV(key, fetcher, { ...config, use });
  }) as SWRVHook;
};
