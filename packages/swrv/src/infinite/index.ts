import { ref, watch } from "vue";

import { useSWRVConfig } from "../config";
import { withMiddleware } from "../_internal";
import useSWRV from "../use-swrv";
import { callFetcher, serialize } from "../_internal/serialize";

import type {
  BareFetcher,
  KeySource,
  MutatorCallback,
  MutatorOptions,
  RawKey,
  SWRVConfiguration,
  SWRVHook,
  SWRVMiddleware,
  SWRVResponse,
} from "../_internal/types";

const INFINITE_PREFIX = "$inf$";
const sizeStorage = new WeakMap<object, Map<string, number>>();
const revalidationStorage = new WeakMap<object, Map<string, InfiniteRevalidationState<any>>>();

export type SWRVInfiniteKeyLoader<Data = unknown> = (
  index: number,
  previousPageData: Data | null,
) => RawKey;

export interface SWRVInfiniteConfiguration<Data = unknown, Error = unknown> extends Omit<
  SWRVConfiguration<Data[], Error>,
  "compare"
> {
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

export interface SWRVInfiniteRevalidateFn<Data = unknown> {
  (data: Data | undefined, key: RawKey): boolean;
}

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

interface InfiniteRevalidationState<Data = unknown> {
  revalidate?: boolean | SWRVInfiniteRevalidateFn<Data>;
  revalidateAll?: boolean;
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

function getRevalidationStore(storageKey: object) {
  const current = revalidationStorage.get(storageKey);
  if (current) {
    return current;
  }

  const next = new Map<string, InfiniteRevalidationState<any>>();
  revalidationStorage.set(storageKey, next);
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

const infinite = (<Data = unknown, Error = unknown>(useSWRVNext: SWRVHook) =>
  (
    getKey: SWRVInfiniteKeyLoader<Data>,
    fetcher: BareFetcher<Data> | null | undefined,
    config: SWRVInfiniteConfiguration<Data, Error> = {},
  ): SWRVInfiniteResponse<Data, Error> => {
    const { client } = useSWRVConfig();
    const sizeStore = getSizeStore(client.cache as object);
    const revalidationStore = getRevalidationStore(client.cache as object);
    const initialSize = config.initialSize ?? 1;

    const size = ref(initialSize);

    const resolveInfiniteKey = () => unstable_serialize(getKey);

    const resolvePages = async (infiniteKey: string, options: { revalidateAll?: boolean } = {}) => {
      const pages: Data[] = [];
      const tasks: Array<Promise<void>> = [];
      const pendingRevalidation = revalidationStore.get(infiniteKey);
      if (pendingRevalidation) {
        revalidationStore.delete(infiniteKey);
      }
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
          Boolean(fetcher) &&
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

        const preloaded = client.consumePreload<Data>(serializedPageKey);
        const result = await (preloaded ?? callFetcher(fetcher as BareFetcher<Data>, rawPageKey));
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

    const swrv = useSWRVNext(
      (() => resolveInfiniteKey() || null) as KeySource<RawKey>,
      (async () => resolvePages(resolveInfiniteKey())) as BareFetcher<Data[]>,
      config,
    ) as SWRVResponse<Data[], Error>;

    const mutatePages: SWRVInfiniteResponse<Data, Error>["mutate"] = async function (
      value,
      options,
    ) {
      const infiniteKey = resolveInfiniteKey();
      if (!infiniteKey) {
        return undefined;
      }

      const normalizedOptions = (
        typeof options === "boolean" ? { revalidate: options } : (options ?? {})
      ) as SWRVInfiniteMutatorOptions<Data[], any>;
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

      return swrv.mutate(value, {
        ...normalizedOptions,
        revalidate: shouldRevalidate,
      } as never);
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
  }) as unknown as SWRVMiddleware;

const useSWRVInfiniteWithMiddleware = withMiddleware(useSWRV, infinite);

export default function useSWRVInfinite<Data = unknown, Error = unknown>(
  getKey: SWRVInfiniteKeyLoader<Data>,
  fetcher: BareFetcher<Data> | null | undefined,
  config: SWRVInfiniteConfiguration<Data, Error> = {},
): SWRVInfiniteResponse<Data, Error> {
  return useSWRVInfiniteWithMiddleware(
    getKey as never,
    fetcher as never,
    config as never,
  ) as unknown as SWRVInfiniteResponse<Data, Error>;
}
