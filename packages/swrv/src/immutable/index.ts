import type { SWRVMiddleware } from "../index";
import useSWRV from "../index/use-swr";
import { withMiddleware } from "../_internal/utils/with-middleware";

export const immutable: SWRVMiddleware =
  (useSWRVNext) =>
  (key, fetcher, config = {}) => {
    config.revalidateOnFocus = false;
    config.revalidateIfStale = false;
    config.revalidateOnReconnect = false;
    config.refreshInterval = 0;
    return useSWRVNext(key, fetcher, config);
  };

const useSWRVImmutable = withMiddleware(useSWRV, immutable) as typeof useSWRV;

export default useSWRVImmutable;
export type SWRVImmutableHook = typeof useSWRVImmutable;
