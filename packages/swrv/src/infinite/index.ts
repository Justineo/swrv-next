import { ref, watch } from "vue";

import { useSWRVConfig } from "../config";
import useSWRV from "../use-swrv";
import { callFetcher, serialize } from "../_internal/serialize";

import type { BareFetcher, RawKey, SWRVConfiguration, SWRVResponse } from "../_internal/types";

const INFINITE_PREFIX = "$inf$";

export type SWRVInfiniteKeyLoader<Data = unknown> = (
  index: number,
  previousPageData: Data | null,
) => RawKey;

export interface SWRVInfiniteConfiguration<
  Data = unknown,
  Error = unknown,
> extends SWRVConfiguration<Data[], Error> {
  initialSize?: number;
  parallel?: boolean;
  persistSize?: boolean;
  revalidateAll?: boolean;
}

export interface SWRVInfiniteResponse<Data = unknown, Error = unknown> extends SWRVResponse<
  Data[],
  Error
> {
  setSize: (size: number | ((currentSize: number) => number)) => Promise<Data[] | undefined>;
  size: SWRVResponse<number, never>["data"];
}

export default function useSWRVInfinite<Data = unknown, Error = unknown>(
  getKey: SWRVInfiniteKeyLoader<Data>,
  fetcher: BareFetcher<Data> | null | undefined,
  config: SWRVInfiniteConfiguration<Data, Error> = {},
): SWRVInfiniteResponse<Data, Error> {
  const { client } = useSWRVConfig();

  const size = ref(config.initialSize ?? 1);

  watch(
    () => serialize(getKey(0, null))[0],
    () => {
      if (!config.persistSize) {
        size.value = config.initialSize ?? 1;
      }
    },
  );

  const swrv = useSWRV<Data[], Error>(
    () => {
      const [serializedKey] = serialize(getKey(0, null));
      return serializedKey ? `${INFINITE_PREFIX}${serializedKey}:${size.value}` : null;
    },
    async () => {
      if (!fetcher) {
        return [];
      }

      const pages: Data[] = [];
      const tasks: Array<Promise<void>> = [];
      let previousPageData: Data | null = null;

      const loadPage = async (index: number, pageKey: RawKey) => {
        const [serializedPageKey, rawPageKey] = serialize(pageKey);
        if (!serializedPageKey) {
          return;
        }

        const cached = client.getState<Data, Error>(serializedPageKey);
        if (!config.revalidateAll && cached?.data !== undefined) {
          pages[index] = cached.data;
          if (!config.parallel) {
            previousPageData = cached.data;
          }
          return;
        }

        const result = await callFetcher(fetcher, rawPageKey);
        client.setState<Data, Error>(
          serializedPageKey,
          {
            data: result,
            error: undefined,
            isLoading: false,
            isValidating: false,
          },
          config.ttl ?? 0,
          rawPageKey,
        );

        pages[index] = result;
        if (!config.parallel) {
          previousPageData = result;
        }
      };

      for (let index = 0; index < size.value; index += 1) {
        const pageKey = getKey(index, config.parallel ? null : previousPageData);
        const [serializedPageKey] = serialize(pageKey);
        if (!serializedPageKey) {
          break;
        }

        if (config.parallel) {
          tasks.push(loadPage(index, pageKey));
        } else {
          await loadPage(index, pageKey);
        }
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }

      return pages;
    },
    config,
  );

  return {
    ...swrv,
    setSize: async (nextSize) => {
      size.value = typeof nextSize === "function" ? nextSize(size.value) : nextSize;
      return swrv.mutate(undefined, { revalidate: true });
    },
    size,
  };
}
