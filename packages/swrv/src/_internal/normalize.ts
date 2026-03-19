import type { BareFetcher } from "./types";

export function normalizeHookArgs<
  Data = unknown,
  Config extends { fetcher?: unknown } = { fetcher?: unknown },
>(
  fetcherOrConfig?: BareFetcher<Data> | Config | null | false,
  config?: Config,
): [BareFetcher<Data> | null | false | undefined, Config | undefined] {
  if (
    typeof fetcherOrConfig === "function" ||
    fetcherOrConfig === null ||
    fetcherOrConfig === false ||
    fetcherOrConfig === undefined
  ) {
    return [fetcherOrConfig, config];
  }

  return [null, fetcherOrConfig];
}
