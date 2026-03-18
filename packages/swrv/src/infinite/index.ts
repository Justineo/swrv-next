import { ref, watch } from "vue";

import { useSWRVConfig } from "../config";
import useSWRV from "../use-swrv";
import { callFetcher, serialize } from "../_internal/serialize";

import type {
  BareFetcher,
  KeySource,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
} from "../_internal/types";

const INFINITE_PREFIX = "$inf$";
const sizeStorage = new WeakMap<object, Map<string, number>>();

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
  revalidateFirstPage?: boolean;
}

export interface SWRVInfiniteResponse<Data = unknown, Error = unknown> extends SWRVResponse<
  Data[],
  Error
> {
  setSize: (size: number | ((currentSize: number) => number)) => Promise<Data[] | undefined>;
  size: SWRVResponse<number, never>["data"];
}

function getSizeStore(storageKey: object) {
  const current = sizeStorage.get(storageKey);
  if (current) {
    return current;
  }

  const next = new Map<string, number>();
  sizeStorage.set(storageKey, next);
  return next;
}

function serializePage<Data = unknown>(
  getKey: SWRVInfiniteKeyLoader<Data>,
  index: number,
  previousPageData: Data | null,
): [string, RawKey] {
  try {
    return serialize(getKey(index, previousPageData));
  } catch {
    return ["", null];
  }
}

export function unstable_serialize<Data = unknown>(getKey: SWRVInfiniteKeyLoader<Data>) {
  const [serializedKey] = serializePage(getKey, 0, null);
  return serializedKey ? `${INFINITE_PREFIX}${serializedKey}` : "";
}

export default function useSWRVInfinite<Data = unknown, Error = unknown>(
  getKey: SWRVInfiniteKeyLoader<Data>,
  fetcher: BareFetcher<Data> | null | undefined,
  config: SWRVInfiniteConfiguration<Data, Error> = {},
): SWRVInfiniteResponse<Data, Error> {
  const { client } = useSWRVConfig();
  const sizeStore = getSizeStore(client.cache as object);
  const initialSize = config.initialSize ?? 1;

  const size = ref(initialSize);

  const resolveInfiniteKey = () => unstable_serialize(getKey);

  const resolvePages = async (infiniteKey: string, options: { revalidateAll?: boolean } = {}) => {
    const pages: Data[] = [];
    const tasks: Array<Promise<void>> = [];
    const revalidateFirstPage =
      config.revalidateFirstPage !== false &&
      client.getState<Data[], Error>(infiniteKey)?.data !== undefined;
    let previousPageData: Data | null = null;

    const loadPage = async (index: number, pageKey: RawKey) => {
      const [serializedPageKey, rawPageKey] = serialize(pageKey);
      if (!serializedPageKey) {
        return;
      }

      const cached = client.getState<Data, Error>(serializedPageKey);
      const shouldFetchPage =
        Boolean(fetcher) &&
        (options.revalidateAll ||
          config.revalidateAll ||
          cached?.data === undefined ||
          (revalidateFirstPage && index === 0));

      if (!shouldFetchPage) {
        if (cached?.data !== undefined) {
          pages[index] = cached.data;
          if (!config.parallel) {
            previousPageData = cached.data;
          }
        }
        return;
      }

      const result = await callFetcher(fetcher as BareFetcher<Data>, rawPageKey);
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
      const [, previousRawPage] = serializePage(
        getKey,
        index,
        config.parallel ? null : previousPageData,
      );
      const [serializedPageKey] = serialize(previousRawPage);
      if (!serializedPageKey) {
        break;
      }

      if (config.parallel) {
        tasks.push(loadPage(index, previousRawPage));
      } else {
        await loadPage(index, previousRawPage);
      }
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }

    return pages;
  };

  watch(
    resolveInfiniteKey,
    (infiniteKey, previousInfiniteKey) => {
      if (!infiniteKey) {
        size.value = initialSize;
        return;
      }

      if (config.persistSize && previousInfiniteKey && previousInfiniteKey !== infiniteKey) {
        sizeStore.set(infiniteKey, size.value);
        return;
      }

      const nextSize = sizeStore.get(infiniteKey) ?? initialSize;
      size.value = nextSize;
      sizeStore.set(infiniteKey, nextSize);
    },
    { immediate: true },
  );

  const swrv = useSWRV(
    (() => resolveInfiniteKey() || null) as KeySource<RawKey>,
    (async () => resolvePages(resolveInfiniteKey())) as BareFetcher<Data[]>,
    config,
  ) as SWRVResponse<Data[], Error>;

  const mutatePages: SWRVInfiniteResponse<Data, Error>["mutate"] = async function (value, options) {
    if (arguments.length === 0) {
      const infiniteKey = resolveInfiniteKey();
      if (!infiniteKey) {
        return undefined;
      }

      const pages = await resolvePages(infiniteKey, { revalidateAll: true });
      await swrv.mutate(pages, { revalidate: false });
      return pages;
    }

    return swrv.mutate(value, options as never);
  };

  return {
    ...swrv,
    mutate: mutatePages,
    setSize: async (nextSize) => {
      const infiniteKey = resolveInfiniteKey();
      if (!infiniteKey) {
        return undefined;
      }

      size.value = typeof nextSize === "function" ? nextSize(size.value) : nextSize;
      sizeStore.set(infiniteKey, size.value);

      const pages = await resolvePages(infiniteKey);
      await swrv.mutate(pages, { revalidate: false });
      return pages;
    },
    size,
  };
}
