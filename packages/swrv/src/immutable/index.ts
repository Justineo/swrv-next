import useSWRV from "../index/use-swrv";
import { withMiddleware } from "../_internal/with-middleware";

import type { SWRVMiddleware } from "../_internal/types";

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

const useSWRVImmutable = withMiddleware(useSWRV, immutable) as typeof useSWRV;

export default useSWRVImmutable;
export type SWRVImmutableHook = typeof useSWRVImmutable;
