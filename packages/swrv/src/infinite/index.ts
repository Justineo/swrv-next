import { ref, watch } from "vue";

import { useSWRVConfig, useSWRVContext } from "../config";
import { applyFeatureMiddleware } from "../_internal";
import {
  getInfiniteRevalidationStore,
  getInfiniteSizeStore,
  type InfiniteRevalidateFn,
} from "../_internal/infinite-state";
import { createInfiniteCacheKey } from "../_internal/key-prefix";
import { resolveMiddlewareStack } from "../_internal/middleware-stack";
import { normalizeHookArgs } from "../_internal/normalize";
import { useSWRVHandler } from "../use-swrv-handler";
import { callFetcher, serialize } from "../_internal/serialize";

import type {
  BareFetcher,
  Fetcher,
  MutatorCallback,
  MutatorOptions,
  RawKey,
  SWRVConfiguration,
  SWRVHook,
  SWRVResponse,
} from "../_internal/types";

export type SWRVInfiniteKeyLoader<Data = unknown, Key extends RawKey = RawKey> = (
  index: number,
  previousPageData: Data | null,
) => Key;

export interface SWRVInfiniteConfiguration<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
> extends Omit<SWRVConfiguration<Data[], Error>, "compare" | "fetcher"> {
  fetcher?: Fetcher<Data, Key> | null | false;
  initialSize?: number;
  parallel?: boolean;
  persistSize?: boolean;
  revalidateAll?: boolean;
  revalidateFirstPage?: boolean;
  compare?: SWRVInfiniteCompareFn<Data>;
}

export interface SWRVInfiniteCompareFn<Data = unknown> {
  (left: Data | undefined, right: Data | undefined): boolean;
  (left: Data[] | undefined, right: Data[] | undefined): boolean;
}

export type SWRVInfiniteRevalidateFn<Data = unknown> = InfiniteRevalidateFn<Data>;

export type SWRVInfiniteKeyedMutator<Data> = <MutationData = Data>(
  data?: MutationData | Promise<MutationData | undefined> | MutatorCallback<Data, MutationData>,
  options?: boolean | SWRVInfiniteMutatorOptions<Data, MutationData>,
) => Promise<Data | MutationData | undefined>;

export interface SWRVInfiniteMutatorOptions<Data = unknown, MutationData = Data> extends Omit<
  MutatorOptions<Data, MutationData>,
  "revalidate"
> {
  revalidate?: boolean | SWRVInfiniteRevalidateFn<Data extends unknown[] ? Data[number] : never>;
}

export interface SWRVInfiniteResponse<Data = unknown, Error = unknown> extends Omit<
  SWRVResponse<Data[], Error>,
  "mutate"
> {
  mutate: SWRVInfiniteKeyedMutator<Data[]>;
  setSize: (size: number | ((currentSize: number) => number)) => Promise<Data[] | undefined>;
  size: SWRVResponse<number, never>["data"];
}

type SWRVInfiniteHook = <Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
  fetcher?: BareFetcher<Data> | null | false,
  config?: SWRVInfiniteConfiguration<Data, Error, Key>,
) => SWRVInfiniteResponse<Data, Error>;

function serializePage<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
  index: number,
  previousPageData: Data | null,
): [string, RawKey] {
  try {
    return serialize(getKey(index, previousPageData));
  } catch {
    return ["", null];
  }
}

export function unstable_serialize<Data = unknown, Key extends RawKey = RawKey>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
): string {
  const [serializedKey] = serializePage(getKey, 0, null);
  return serializedKey ? createInfiniteCacheKey(serializedKey) : "";
}

function createInfiniteHook(useSWRVNext: SWRVHook): SWRVInfiniteHook {
  return function useSWRVInfiniteHook<Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
    getKey: SWRVInfiniteKeyLoader<Data, Key>,
    fetcher: BareFetcher<Data> | null | undefined | false,
    config: SWRVInfiniteConfiguration<Data, Error, Key> = {},
  ): SWRVInfiniteResponse<Data, Error> {
    const { client } = useSWRVConfig();
    const sizeStore = getInfiniteSizeStore(client.cache as object);
    const revalidationStore = getInfiniteRevalidationStore<Data>(client.cache as object);
    const initialSize = config.initialSize ?? 1;

    const size = ref(initialSize);

    const getInfiniteKey = () => unstable_serialize(getKey);

    const loadPages = async (infiniteKey: string, options: { revalidateAll?: boolean } = {}) => {
      const pages: Data[] = [];
      const tasks: Array<Promise<void>> = [];
      const pendingRevalidation = revalidationStore.get(infiniteKey);
      if (pendingRevalidation) {
        revalidationStore.delete(infiniteKey);
      }
      const activeFetcher = fetcher ?? config.fetcher;
      const cachedPages = client.getState<Data[], Error>(infiniteKey)?.data;
      const revalidateFirstPage = config.revalidateFirstPage !== false && cachedPages !== undefined;
      let previousPageData: Data | null = null;

      const loadPage = async (index: number, pageKey: RawKey) => {
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
          (revalidateFirstPage && index === 0) ||
          (aggregatePageData !== undefined &&
            !(config.compare ?? Object.is)(aggregatePageData, cached?.data));
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
          const [serializedPageKey]: [string, RawKey] = serializePage(
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
}

export default function useSWRVInfinite<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
  fetcher: BareFetcher<Data> | null | undefined | false,
  config?: SWRVInfiniteConfiguration<Data, Error, Key>,
): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
  config: SWRVInfiniteConfiguration<Data, Error, Key>,
): SWRVInfiniteResponse<Data, Error>;
export default function useSWRVInfinite<Data = unknown, Error = unknown>(
  getKey: SWRVInfiniteKeyLoader<Data>,
  fetcherOrConfig?: BareFetcher<Data> | SWRVInfiniteConfiguration<Data, Error> | null | false,
  config?: SWRVInfiniteConfiguration<Data, Error>,
): SWRVInfiniteResponse<Data, Error> {
  const context = useSWRVContext();
  const [fetcher, normalizedConfig] = normalizeHookArgs(fetcherOrConfig, config);
  const middlewares = resolveMiddlewareStack(context.config.value, normalizedConfig);
  const runInfinite = applyFeatureMiddleware(createInfiniteHook(useSWRVHandler), middlewares);

  return runInfinite(getKey, fetcher, normalizedConfig);
}
