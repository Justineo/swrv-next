import type { ComputedRef, DefineComponent, Ref } from "vue";

export type RawKey =
  | string
  | readonly unknown[]
  | Record<string, unknown>
  | null
  | undefined
  | false;

export type KeySource<Key = RawKey> = Key | Ref<Key> | ComputedRef<Key> | (() => Key);

export type FetcherResponse<Data = unknown> = Data | Promise<Data>;

export type BareFetcher<Data = unknown> = (...args: readonly unknown[]) => FetcherResponse<Data>;

export type Fetcher<Data = unknown, Key extends RawKey = RawKey> = Key extends readonly unknown[]
  ? (...args: Key) => FetcherResponse<Data>
  : Key extends null | undefined | false
    ? never
    : (arg: Key) => FetcherResponse<Data>;

export interface CacheAdapter<Value = unknown> {
  get(key: string): Value | undefined;
  set(key: string, value: Value): void;
  delete(key: string): void;
  keys(): IterableIterator<string>;
}

export interface CacheState<Data = unknown, Error = unknown> {
  data?: Data;
  error?: Error;
  isLoading: boolean;
  isValidating: boolean;
  updatedAt: number;
  expiresAt: number;
  _c?: Data;
  _k?: RawKey;
}

export type Compare<Data> = (left: Data | undefined, right: Data | undefined) => boolean;

export interface SWRVConfiguration<
  Data = unknown,
  Error = unknown,
  Fn extends BareFetcher<Data> = BareFetcher<Data>,
> {
  cache?: CacheAdapter<CacheState<any, any>>;
  client?: SWRVClient;
  compare?: Compare<Data>;
  dedupingInterval?: number;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  fallback?: Record<string, unknown>;
  fallbackData?: Data;
  fetcher?: Fn | null;
  focusThrottleInterval?: number;
  keepPreviousData?: boolean;
  provider?: () => CacheAdapter<CacheState<any, any>>;
  refreshInterval?: number | ((latestData: Data | undefined) => number);
  refreshWhenHidden?: boolean;
  refreshWhenOffline?: boolean;
  revalidateIfStale?: boolean;
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
  revalidateOnReconnect?: boolean;
  shouldRetryOnError?: boolean | ((error: Error) => boolean);
  ttl?: number;
}

export interface ResolvedSWRVConfiguration<
  Data = unknown,
  Error = unknown,
  Fn extends BareFetcher<Data> = BareFetcher<Data>,
> extends SWRVConfiguration<Data, Error, Fn> {
  compare: Compare<Data>;
  dedupingInterval: number;
  errorRetryCount: number;
  errorRetryInterval: number;
  fallback: Record<string, unknown>;
  focusThrottleInterval: number;
  keepPreviousData: boolean;
  refreshInterval: number | ((latestData: Data | undefined) => number);
  refreshWhenHidden: boolean;
  refreshWhenOffline: boolean;
  revalidateIfStale: boolean;
  revalidateOnFocus: boolean;
  revalidateOnReconnect: boolean;
  shouldRetryOnError: boolean | ((error: Error) => boolean);
  ttl: number;
}

export interface RevalidateOptions {
  dedupe?: boolean;
  force?: boolean;
  retryCount?: number;
  throwOnError?: boolean;
}

export type MutatorCallback<Data = unknown> = (
  currentData: Data | undefined,
) => Data | Promise<Data | undefined> | undefined;

export interface MutatorOptions<Data = unknown, Result = Data> {
  optimisticData?:
    | Data
    | ((currentData: Data | undefined, displayedData: Data | undefined) => Data);
  populateCache?: boolean | ((result: Result, currentData: Data | undefined) => Data);
  revalidate?: boolean | ((data: Data | undefined, key: RawKey) => boolean);
  rollbackOnError?: boolean | ((error: unknown) => boolean);
  throwOnError?: boolean;
}

export type KeyFilter = (key?: RawKey) => boolean;

export type ScopedMutator = <Data = unknown>(
  key: RawKey | KeyFilter,
  data?: Data | Promise<Data | undefined> | MutatorCallback<Data>,
  options?: boolean | MutatorOptions<Data>,
) => Promise<Data | undefined | Array<Data | undefined>>;

export type BoundMutator<Data = unknown> = <Result = Data>(
  data?: Result | Promise<Result | undefined> | MutatorCallback<Result>,
  options?: boolean | MutatorOptions<Data, Result>,
) => Promise<Data | undefined>;

export interface SWRVResponse<Data = unknown, Error = unknown> {
  data: Ref<Data | undefined>;
  error: Ref<Error | undefined>;
  isLoading: Ref<boolean>;
  isValidating: Ref<boolean>;
  mutate: BoundMutator<Data>;
}

export type RevalidateEvent = "focus" | "reconnect" | "mutate" | "error-revalidate";

export interface RevalidateEventOptions {
  dedupe?: boolean;
  force?: boolean;
  revalidate?: boolean | ((data: unknown, key: RawKey) => boolean);
  throwOnError?: boolean;
}

export type Revalidator = (
  event: RevalidateEvent,
  options?: RevalidateEventOptions,
) => Promise<unknown> | void;

export type CacheListener = (
  current: CacheState<any, any> | undefined,
  previous: CacheState<any, any> | undefined,
) => void;

export interface FetchRecord {
  promise: Promise<unknown>;
  startedAt: number;
}

export interface SWRVClientState {
  fetches: Map<string, FetchRecord>;
  listeners: Map<string, Set<CacheListener>>;
  latestFetchTimestamp: Map<string, number>;
  mutations: Map<string, [number, number]>;
  preloads: Map<string, Promise<unknown>>;
  revalidators: Map<string, Set<Revalidator>>;
}

export interface SWRVClient {
  cache: CacheAdapter<CacheState<any, any>>;
  state: SWRVClientState;
  addRevalidator(key: string, callback: Revalidator): () => void;
  broadcast(
    key: string,
    event: RevalidateEvent,
    options?: RevalidateEventOptions,
  ): Promise<unknown[]>;
  broadcastAll(event: RevalidateEvent): Promise<void>;
  consumePreload<Data = unknown>(key: string): Promise<Data> | undefined;
  dispose(): void;
  getFetch(key: string, now: number, dedupingInterval: number): FetchRecord | undefined;
  getMutation(key: string): [number, number] | undefined;
  getState<Data = unknown, Error = unknown>(key: string): CacheState<Data, Error> | undefined;
  isLatestFetch(key: string, startedAt: number): boolean;
  preload<Data = unknown>(key: string, value: Promise<Data>): Promise<Data>;
  setMutation(key: string, value: [number, number]): void;
  setState<Data = unknown, Error = unknown>(
    key: string,
    patch: Partial<CacheState<Data, Error>>,
    ttl?: number,
    rawKey?: RawKey,
  ): CacheState<Data, Error>;
  startFetch(
    key: string,
    value: Promise<unknown>,
    startedAt: number,
    dedupingInterval: number,
  ): void;
  subscribe(key: string, callback: CacheListener): () => void;
}

export interface SWRVContextValue {
  client: SWRVClient;
  config: Readonly<Ref<ResolvedSWRVConfiguration<any, any>>>;
}

export interface SWRVConfigAccessor {
  cache: CacheAdapter<CacheState<any, any>>;
  client: SWRVClient;
  config: ResolvedSWRVConfiguration<any, any>;
  mutate: ScopedMutator;
  preload: <Data = unknown>(key: RawKey, fetcher: () => Promise<Data>) => Promise<Data>;
}

export type SWRVConfigComponent = DefineComponent<{
  value?: SWRVConfiguration<any, any>;
}>;
