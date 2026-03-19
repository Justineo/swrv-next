import { onMounted, ref, watch } from "vue";

import { useSWRVConfig } from "../config";
import { normalize } from "../_internal/normalize-args";
import { callFetcher, serialize } from "../_internal/serialize";
import { type HookWithArgs, withMiddleware } from "../_internal/with-middleware";
import useSWRV from "../index/use-swrv";
import { getInfiniteRevalidationStore, getInfiniteSizeStore } from "./state";
import { getInfinitePage, unstable_serialize } from "./serialize";

import type { BareFetcher, FetcherResponse, RawKey } from "../_internal/types";
import type {
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
    const sizeStore = getInfiniteSizeStore(client.cache as object);
    const revalidationStore = getInfiniteRevalidationStore<Data>(client.cache as object);
    const initialSize = config.initialSize ?? 1;
    const didMount = ref(false);

    const size = ref(initialSize);

    onMounted(() => {
      didMount.value = true;
    });

    function getInfiniteKey(): string {
      return unstable_serialize(getKey);
    }

    async function loadPages(
      infiniteKey: string,
      options: { revalidateAll?: boolean } = {},
    ): Promise<Data[]> {
      const pages: Data[] = [];
      const tasks: Array<Promise<void>> = [];
      const pendingRevalidation = revalidationStore.get(infiniteKey);
      if (pendingRevalidation) {
        revalidationStore.delete(infiniteKey);
      }
      const activeFetcher = fetcher ?? config.fetcher;
      const cachedPages = client.getState<Data[], Error>(infiniteKey)?.data;
      const revalidateFirstPage = config.revalidateFirstPage !== false && cachedPages !== undefined;
      const revalidateOnMount = config.revalidateOnMount === true && !didMount.value;
      let previousPageData: Data | null = null;

      async function loadPage(index: number, pageKey: RawKey): Promise<void> {
        const [serializedPageKey, rawPageKey] = serialize(pageKey);
        if (!serializedPageKey) {
          return;
        }

        const cached = client.getState<Data, Error>(serializedPageKey);
        const aggregatePageData =
          Array.isArray(cachedPages) && index < cachedPages.length ? cachedPages[index] : undefined;
        const shouldFetchPage =
          options.revalidateAll ||
          pendingRevalidation?.revalidateAll ||
          config.revalidateAll ||
          cached?.data === undefined ||
          revalidateOnMount ||
          (revalidateFirstPage && index === 0) ||
          (aggregatePageData !== undefined &&
            !(config.compare ?? rootConfig.compare)(aggregatePageData, cached?.data));
        const shouldRevalidatePage = pendingRevalidation?.revalidate;
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

      for (let index = 0; index < size.value; index += 1) {
        const [, rawPageKey] = getInfinitePage(
          getKey,
          index,
          config.parallel ? null : previousPageData,
        );
        const [serializedPageKey] = serialize(rawPageKey);
        if (!serializedPageKey) {
          break;
        }

        if (config.parallel) {
          tasks.push(loadPage(index, rawPageKey));
        } else {
          await loadPage(index, rawPageKey);
        }
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }

      return pages;
    }

    watch(
      getInfiniteKey,
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
        revalidationStore.set(infiniteKey, {
          revalidateAll: arguments.length === 0,
          revalidate: normalizedOptions.revalidate,
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

        size.value = typeof nextSize === "function" ? nextSize(size.value) : nextSize;
        sizeStore.set(infiniteKey, size.value);

        const pages: Data[] = [];
        let previousPageData: Data | null = null;

        for (let index = 0; index < size.value; index += 1) {
          const [serializedPageKey]: [string, RawKey] = getInfinitePage(
            getKey,
            index,
            config.parallel ? null : previousPageData,
          );

          if (!serializedPageKey) {
            break;
          }

          const cachedPageData: Data | undefined = client.getState<Data, Error>(
            serializedPageKey,
          )?.data;
          if (cachedPageData === undefined) {
            const currentPages = client.getState<Data[], Error>(infiniteKey)?.data;
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
  SWRVInfiniteCompareFn,
  SWRVInfiniteConfiguration,
  SWRVInfiniteFetcher,
  SWRVInfiniteKeyLoader,
  SWRVInfiniteKeyedMutator,
  SWRVInfiniteMutatorOptions,
  SWRVInfiniteRevalidateFn,
  SWRVInfiniteResponse,
} from "./types";
