import type {
  BareFetcher,
  Fetcher,
  MutatorCallback,
  MutatorOptions,
  RawKey,
  SWRVConfiguration,
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
  fetcher?: Fetcher<Data, Key> | null;
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

export interface SWRVInfiniteRevalidationState<Data = unknown> {
  revalidate?: boolean | SWRVInfiniteRevalidateFn<Data>;
  revalidateAll?: boolean;
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

export type InternalSWRVInfiniteHook = <
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(
  getKey: SWRVInfiniteKeyLoader<Data, Key>,
  fetcher?: BareFetcher<Data> | null,
  config?: SWRVInfiniteConfiguration<Data, Error, Key>,
) => SWRVInfiniteResponse<Data, Error>;
