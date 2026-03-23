import { onMounted, ref, watch } from "vue";

import { useSWRVConfig } from "../_internal/utils/config-context";
import { INFINITE_PREFIX } from "../_internal/constants";
import { normalize } from "../_internal/utils/normalize-args";
import { callFetcher, serialize } from "../_internal/utils/serialize";
import { type HookWithArgs, withMiddleware } from "../_internal/utils/with-middleware";
import useSWRV from "../index/use-swr";
import { getFirstPageKey, unstable_serialize } from "./serialize";

import type { BareFetcher, CacheState, FetcherResponse, RawKey } from "../_internal/types";
import type {
  SWRVInfiniteCacheState,
  InternalSWRVInfiniteHook,
  SWRVInfiniteConfiguration,
  SWRVInfiniteKeyLoader,
  SWRVInfiniteResponse,
} from "./types";

export { unstable_serialize };

type NonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;
type NullableKey<Key extends RawKey> = Key | null | undefined | false;

export const infinite = function infinite(useSWRVNext: HookWithArgs): InternalSWRVInfiniteHook {
  return function useSWRVInfinite<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
    getKey: SWRVInfiniteKeyLoader<Data, Key>,
    fetcher: BareFetcher<Data> | null | undefined,
    config: SWRVInfiniteConfiguration<Data, Error, Key> = {},
  ): SWRVInfiniteResponse<Data, Error> {
    const { client, config: rootConfig } = useSWRVConfig();
    const initialSize = config.initialSize ?? 1;
    const didMount = ref(false);
    const size = ref(initialSize);
    const lastPageSize = ref(initialSize);

    onMounted(() => {
      didMount.value = true;
    });

    function getInfiniteState(infiniteKey: string) {
      return client.getState<Data[], Error>(infiniteKey) as SWRVInfiniteCacheState<Data[], Error>;
    }

    function setInfiniteState(
      infiniteKey: string,
      patch: Partial<SWRVInfiniteCacheState<Data[], Error>>,
    ): SWRVInfiniteCacheState<Data[], Error> {
      return client.setState<Data[], Error>(
        infiniteKey,
        patch as Partial<CacheState<Data[], Error>>,
      ) as SWRVInfiniteCacheState<Data[], Error>;
    }

    function resolvePageSize(infiniteKey: string): number {
      const cachedPageSize = getInfiniteState(infiniteKey)?._l;
      return cachedPageSize === undefined ? initialSize : cachedPageSize;
    }

    function getInfiniteKey(): string {
      const firstPageKey = getFirstPageKey(getKey);
      return firstPageKey ? INFINITE_PREFIX + firstPageKey : "";
    }

    async function loadPages(infiniteKey: string): Promise<Data[]> {
      const pages: Data[] = [];
      const tasks: Array<Promise<void>> = [];
      const infiniteState = getInfiniteState(infiniteKey);
      const activeFetcher = fetcher ?? config.fetcher;
      const cachedPages = infiniteState?.data;
      const revalidateFirstPage = config.revalidateFirstPage !== false && cachedPages !== undefined;
      const revalidateOnMount = config.revalidateOnMount === true && !didMount.value;
      const forceRevalidateAll = infiniteState?._i;
      const shouldRevalidatePage = infiniteState?._r;
      setInfiniteState(infiniteKey, { _r: undefined });
      const pageSize = resolvePageSize(infiniteKey);
      let previousPageData: Data | null = null;

      async function loadPage(index: number, pageKey: RawKey, rawPageKey: RawKey): Promise<void> {
        const [serializedPageKey] = serialize(pageKey);
        if (!serializedPageKey) {
          return;
        }

        const cached = client.getState<Data, Error>(serializedPageKey);
        const aggregatePageData =
          Array.isArray(cachedPages) && index < cachedPages.length ? cachedPages[index] : undefined;
        const shouldFetchPage =
          config.revalidateAll ||
          forceRevalidateAll ||
          cached?.data === undefined ||
          revalidateOnMount ||
          (revalidateFirstPage && index === 0) ||
          (aggregatePageData !== undefined &&
            !(config.compare ?? rootConfig.compare)(aggregatePageData, cached?.data));
        const shouldFetchCurrentPage =
          Boolean(activeFetcher) &&
          (typeof shouldRevalidatePage === "function"
            ? shouldRevalidatePage(cached?.data, rawPageKey)
            : shouldRevalidatePage === true
              ? true
              : shouldFetchPage);

        if (!shouldFetchCurrentPage) {
          if (cached?.data !== undefined) {
            pages[index] = cached.data;
            if (!config.parallel) {
              previousPageData = cached.data;
            }
          }
          return;
        }

        if (!activeFetcher) {
          return;
        }

        const preloaded = client.consumePreload<Data>(serializedPageKey);
        const result = await (preloaded ??
          callFetcher(activeFetcher as BareFetcher<Data>, rawPageKey));
        client.setState<Data, Error>(
          serializedPageKey,
          {
            data: result,
            error: undefined,
            isLoading: false,
            isValidating: false,
          },
          rawPageKey,
        );

        pages[index] = result;
        if (!config.parallel) {
          previousPageData = result;
        }
      }

      for (let index = 0; index < pageSize; index += 1) {
        let pageKey: RawKey;
        try {
          pageKey = getKey(index, config.parallel ? null : previousPageData);
        } catch {
          break;
        }

        const [serializedPageKey, rawPageKey] = serialize(pageKey);
        if (!serializedPageKey) {
          break;
        }

        if (config.parallel) {
          tasks.push(loadPage(index, pageKey, rawPageKey));
        } else {
          await loadPage(index, pageKey, rawPageKey);
        }
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }

      setInfiniteState(infiniteKey, { _i: undefined });
      return pages;
    }

    watch(
      getInfiniteKey,
      (infiniteKey, previousInfiniteKey) => {
        if (!infiniteKey) {
          size.value = initialSize;
          lastPageSize.value = initialSize;
          return;
        }

        const nextSize =
          config.persistSize && previousInfiniteKey && previousInfiniteKey !== infiniteKey
            ? lastPageSize.value
            : resolvePageSize(infiniteKey);
        size.value = nextSize;
        lastPageSize.value = nextSize;
        setInfiniteState(infiniteKey, { _l: nextSize });
      },
      { immediate: true },
    );

    const { fetcher: _pageFetcher, ...swrvConfig } = config;
    const swrv = useSWRVNext<Data[], Error>(
      () => getInfiniteKey() || null,
      async () => loadPages(getInfiniteKey()),
      swrvConfig,
    );

    const mutatePages: SWRVInfiniteResponse<Data, Error>["mutate"] = async function (
      value,
      options,
    ) {
      const infiniteKey = getInfiniteKey();
      if (!infiniteKey) {
        return undefined;
      }

      const normalizedOptions =
        typeof options === "boolean" ? { revalidate: options } : (options ?? {});
      const shouldRevalidate = normalizedOptions.revalidate !== false;

      if (shouldRevalidate) {
        setInfiniteState(infiniteKey, {
          _i: arguments.length === 0,
          _r: normalizedOptions.revalidate,
        });
      }

      if (arguments.length === 0) {
        return swrv.mutate();
      }

      const { revalidate: _revalidate, ...mutateOptions } = normalizedOptions;

      return swrv.mutate(value, {
        ...mutateOptions,
        revalidate: shouldRevalidate,
      });
    };

    return {
      ...swrv,
      mutate: mutatePages,
      setSize: async (nextSize) => {
        const infiniteKey = getInfiniteKey();
        if (!infiniteKey) {
          return undefined;
        }

        const resolvedSize =
          typeof nextSize === "function" ? nextSize(resolvePageSize(infiniteKey)) : nextSize;

        if (typeof resolvedSize !== "number") {
          return undefined;
        }

        size.value = resolvedSize;
        lastPageSize.value = resolvedSize;
        setInfiniteState(infiniteKey, { _l: resolvedSize });

        const pages: Data[] = [];
        const currentPages = getInfiniteState(infiniteKey)?.data;
        let previousPageData: Data | null = null;

        for (let index = 0; index < resolvedSize; index += 1) {
          let pageKey: RawKey;
          try {
            pageKey = getKey(index, config.parallel ? null : previousPageData);
          } catch {
            break;
          }

          const [serializedPageKey] = serialize(pageKey);

          if (!serializedPageKey) {
            break;
          }

          const cachedPageData: Data | undefined = client.getState<Data, Error>(
            serializedPageKey,
          )?.data;
          if (cachedPageData === undefined) {
            if (currentPages === undefined) {
              return mutatePages();
            }

            return mutatePages(currentPages);
          }

          pages.push(cachedPageData);
          if (!config.parallel) {
            previousPageData = cachedPageData;
          }
        }

        return mutatePages(pages);
      },
      size,
    };
  };
};

const useSWRVInfiniteBase = withMiddleware(useSWRV as HookWithArgs, infinite);

export default function useSWRVInfinite<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(getKey: SWRVInfiniteKeyLoader<Data, Key>): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  getKey: SWRVInfiniteKeyLoader<Data, NullableKey<Key>>,
  fetcher: ((...args: [...Key]) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVInfiniteConfiguration<Data, Error, Key>,
): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  getKey: SWRVInfiniteKeyLoader<Data, NullableKey<Key>>,
  fetcher: ((arg: Key) => FetcherResponse<Data>) | null | undefined,
  config?: SWRVInfiniteConfiguration<Data, Error, Key>,
): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<Data = unknown, Error = unknown>(
  getKey: SWRVInfiniteKeyLoader<Data, RawKey>,
  fetcher: BareFetcher<Data> | null | undefined,
  config?: SWRVInfiniteConfiguration<Data, Error>,
): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<
  Data = unknown,
  Error = unknown,
  Key extends readonly unknown[] = readonly unknown[],
>(
  getKey: SWRVInfiniteKeyLoader<Data, NullableKey<Key>>,
  config: SWRVInfiniteConfiguration<Data, Error, Key>,
): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<
  Data = unknown,
  Error = unknown,
  Key extends NonArrayKey = NonArrayKey,
>(
  getKey: SWRVInfiniteKeyLoader<Data, NullableKey<Key>>,
  config: SWRVInfiniteConfiguration<Data, Error, Key>,
): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<Data = unknown, Error = unknown>(
  getKey: SWRVInfiniteKeyLoader<Data>,
  fetcherOrConfig?: BareFetcher<Data> | SWRVInfiniteConfiguration<Data, Error> | null,
  config?: SWRVInfiniteConfiguration<Data, Error>,
): SWRVInfiniteResponse<Data, Error> {
  const [, fetcher, localConfig] = normalize<
    SWRVInfiniteKeyLoader<Data>,
    Data,
    SWRVInfiniteConfiguration<Data, Error>
  >([
    getKey,
    fetcherOrConfig as BareFetcher<Data> | SWRVInfiniteConfiguration<Data, Error> | null,
    config,
  ]);

  return useSWRVInfiniteBase(getKey, fetcher, localConfig);
}

export type SWRVInfiniteHook = typeof useSWRVInfinite;

export type {
  SWRInfiniteCompareFn,
  SWRInfiniteConfiguration,
  SWRInfiniteHook,
  SWRInfiniteKeyedMutator,
  SWRInfiniteKeyLoader,
  SWRInfiniteMutatorOptions,
  SWRInfiniteRevalidateFn,
  SWRInfiniteResponse,
  SWRVInfiniteCompareFn,
  SWRVInfiniteConfiguration,
  SWRVInfiniteFetcher,
  SWRVInfiniteKeyLoader,
  SWRVInfiniteKeyedMutator,
  SWRVInfiniteMutatorOptions,
  SWRVInfiniteRevalidateFn,
  SWRVInfiniteResponse,
} from "./types";
