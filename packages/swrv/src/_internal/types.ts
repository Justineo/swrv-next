import type { ComputedRef, DefineComponent, Ref } from "vue";

export type RawKey =
  | string
  | readonly unknown[]
  | Record<string, unknown>
  | null
  | undefined
  | false;

export type KeySource<Key = RawKey> = Key | Ref<Key> | ComputedRef<Key> | (() => Key);
export type Arguments = RawKey;
export type Key = KeySource<Arguments>;

export type FetcherResponse<Data = unknown> = Data | Promise<Data>;
export type PreloadResponse<Data = unknown> = FetcherResponse<Data> | undefined;

export type BareFetcher<Data = unknown> = (...args: readonly unknown[]) => FetcherResponse<Data>;
export type HookFetcher<Data = unknown> = BareFetcher<Data> | null | undefined;

export type Fetcher<Data = unknown, Key extends RawKey = RawKey> = Key extends readonly unknown[]
  ? (...args: [...Key]) => FetcherResponse<Data>
  : Key extends null | undefined | false
    ? never
    : (arg: Key) => FetcherResponse<Data>;

type PreloadNonArrayKey = Exclude<RawKey, readonly unknown[] | null | undefined | false>;

export interface PreloadFunction {
  <Result = unknown, Key extends readonly unknown[] = readonly unknown[]>(
    key: KeySource<Key>,
    fetcher: (...args: [...Key]) => Promise<Result>,
  ): Promise<Result> | undefined;
  <Result = unknown, Key extends PreloadNonArrayKey = PreloadNonArrayKey>(
    key: KeySource<Key>,
    fetcher: (arg: Key) => Promise<Result>,
  ): Promise<Result> | undefined;
  <Result = unknown, Key extends readonly unknown[] = readonly unknown[]>(
    key: KeySource<Key>,
    fetcher: (...args: [...Key]) => Result,
  ): Result | undefined;
  <Result = unknown, Key extends PreloadNonArrayKey = PreloadNonArrayKey>(
    key: KeySource<Key>,
    fetcher: (arg: Key) => Result,
  ): Result | undefined;
  <Data = unknown, Key extends RawKey = RawKey>(
    key: KeySource<Key>,
    fetcher: Fetcher<Data, Key>,
  ): PreloadResponse<Data>;
}

export interface CacheAdapter<Value = unknown> {
  get(key: string): Value | undefined;
  set(key: string, value: Value): void;
  delete(key: string): void;
  keys(): IterableIterator<string>;
}

export type SWRVFallbackSnapshot = Record<string, unknown>;

export interface CacheState<Data = unknown, Error = unknown> {
  data?: Data;
  error?: Error;
  isLoading: boolean;
  isValidating: boolean;
  _c?: Data;
  _k?: RawKey;
}

export type AnyCacheState = CacheState<unknown, unknown>;
export interface State<Data = unknown, Error = unknown> {
  data?: Data;
  error?: Error;
  isLoading?: boolean;
  isValidating?: boolean;
}
export type Cache<Data = unknown, Error = unknown> = CacheAdapter<State<Data, Error>>;

export type Compare<Data> = (left: Data | undefined, right: Data | undefined) => boolean;
export type SWRVEventInitializer = (callback: () => void) => void | (() => void);

type ResolvedFallbackData<Options> = Options extends { fallbackData: infer F }
  ? Exclude<F, undefined>
  : never;

export type BlockingData<Options = unknown> = [ResolvedFallbackData<Options>] extends [never]
  ? false
  : true;

export interface SWRVConfiguration<Data = unknown, Error = unknown, Fn = BareFetcher<Data>> {
  cache?: CacheAdapter<AnyCacheState>;
  client?: SWRVClient;
  compare?: Compare<Data>;
  dedupingInterval?: number;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  fallback?: Record<string, unknown>;
  fallbackData?: Data;
  fetcher?: Fn;
  focusThrottleInterval?: number;
  initFocus?: SWRVEventInitializer;
  initReconnect?: SWRVEventInitializer;
  isOnline?: () => boolean;
  isPaused?: () => boolean;
  isVisible?: () => boolean;
  keepPreviousData?: boolean;
  loadingTimeout?: number;
  onDiscarded?: (key: string) => void;
  onError?: (
    error: Error,
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
  ) => void;
  onErrorRetry?: (
    error: Error,
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
    revalidate: (options?: RevalidateOptions) => Promise<Data | undefined>,
    options: Required<Pick<RevalidateOptions, "dedupe" | "retryCount" | "throwOnError">>,
  ) => void;
  onLoadingSlow?: (
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
  ) => void;
  onSuccess?: (
    data: Data,
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
  ) => void;
  provider?: (parentCache: CacheAdapter<AnyCacheState>) => CacheAdapter<AnyCacheState>;
  refreshInterval?: number | ((latestData: Data | undefined) => number);
  refreshWhenHidden?: boolean;
  refreshWhenOffline?: boolean;
  revalidateIfStale?: boolean;
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
  revalidateOnReconnect?: boolean;
  shouldRetryOnError?: boolean | ((error: Error) => boolean);
  strictServerPrefetchWarning?: boolean;
  use?: SWRVMiddleware[];
}

export type SWRVConfigurationValue<Data = unknown, Error = unknown, Fn = BareFetcher<Data>> =
  | SWRVConfiguration<Data, Error, Fn>
  | ((parent: ResolvedSWRVConfiguration<Data, Error, Fn>) => SWRVConfiguration<Data, Error, Fn>);

export type AnyConfiguration = SWRVConfiguration<any, any>;
export type AnyConfigurationValue = SWRVConfigurationValue<any, any>;

export interface ResolvedSWRVConfiguration<
  Data = unknown,
  Error = unknown,
  Fn = BareFetcher<Data>,
> extends SWRVConfiguration<Data, Error, Fn> {
  compare: Compare<Data>;
  dedupingInterval: number;
  errorRetryCount?: number;
  errorRetryInterval: number;
  fallback: Record<string, unknown>;
  focusThrottleInterval: number;
  initFocus: SWRVEventInitializer;
  initReconnect: SWRVEventInitializer;
  isOnline: () => boolean;
  isPaused: () => boolean;
  isVisible: () => boolean;
  keepPreviousData: boolean;
  loadingTimeout: number;
  onDiscarded: (key: string) => void;
  onError: (
    error: Error,
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
  ) => void;
  onErrorRetry: (
    error: Error,
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
    revalidate: (options?: RevalidateOptions) => Promise<Data | undefined>,
    options: Required<Pick<RevalidateOptions, "dedupe" | "retryCount" | "throwOnError">>,
  ) => void;
  onLoadingSlow: (
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
  ) => void;
  onSuccess: (
    data: Data,
    key: string,
    config: Readonly<ResolvedSWRVConfiguration<Data, Error, Fn>>,
  ) => void;
  refreshInterval: number | ((latestData: Data | undefined) => number);
  refreshWhenHidden: boolean;
  refreshWhenOffline: boolean;
  revalidateIfStale: boolean;
  revalidateOnFocus: boolean;
  revalidateOnReconnect: boolean;
  shouldRetryOnError: boolean | ((error: Error) => boolean);
  strictServerPrefetchWarning?: boolean;
  use: SWRVMiddleware[];
}

export type AnyResolvedConfiguration = ResolvedSWRVConfiguration<unknown, unknown>;

export interface RevalidateOptions {
  dedupe?: boolean;
  force?: boolean;
  retryCount?: number;
  throwOnError?: boolean;
}

export type MutatorCallback<Data = unknown, Result = Data> = (
  currentData: Data | undefined,
) => Result | Promise<Result | undefined> | undefined;

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

export interface ScopedMutator {
  <Data = unknown, MutationData = Data>(
    key: KeyFilter,
    data?: MutationData | Promise<MutationData | undefined> | MutatorCallback<Data, MutationData>,
    options?: boolean | MutatorOptions<Data, MutationData>,
  ): Promise<Array<MutationData | undefined>>;
  <Data = unknown, MutationData = Data>(
    key: RawKey,
    data?: MutationData | Promise<MutationData | undefined> | MutatorCallback<Data, MutationData>,
    options?: boolean | MutatorOptions<Data, MutationData>,
  ): Promise<MutationData | undefined>;
}

export type BoundMutator<Data = unknown> = <MutationData = Data>(
  data?: MutationData | Promise<MutationData | undefined> | MutatorCallback<Data, MutationData>,
  options?: boolean | MutatorOptions<Data, MutationData>,
) => Promise<Data | MutationData | undefined>;
export type KeyedMutator<Data = unknown> = BoundMutator<Data>;

export interface SWRVResponse<Data = unknown, Error = unknown, Config = unknown> {
  data: Ref<BlockingData<Config> extends true ? Data : Data | undefined>;
  error: Ref<Error | undefined>;
  isLoading: Ref<boolean>;
  isValidating: Ref<boolean>;
  mutate: BoundMutator<Data>;
}

export type InternalSWRVHook = <Data = unknown, Error = unknown, Key extends RawKey = RawKey>(
  key: KeySource<Key>,
  fetcher?: HookFetcher<Data>,
  config?: SWRVConfiguration<Data, Error>,
) => SWRVResponse<Data, Error>;

export type SWRVMiddleware = (useSWRNext: InternalSWRVHook) => InternalSWRVHook;

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
  current: AnyCacheState | undefined,
  previous: AnyCacheState | undefined,
) => void;

export interface FetchRecord {
  promise: Promise<unknown>;
  startedAt: number;
}

export interface SWRVClientState {
  fetches: Map<string, FetchRecord>;
  helpers: {
    mutate?: ScopedMutator;
    preload?: PreloadFunction;
  };
  listeners: Map<string, Set<CacheListener>>;
  latestFetchTimestamp: Map<string, number>;
  mutations: Map<string, [number, number]>;
  preloads: Map<string, Promise<unknown>>;
  revalidators: Map<string, Set<Revalidator>>;
}

export interface SWRVClientOptions {
  initFocus?: SWRVEventInitializer;
  initReconnect?: SWRVEventInitializer;
}

export interface SWRVClient {
  cache: CacheAdapter<AnyCacheState>;
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
  invalidateFetch(key: string): void;
  isLatestFetch(key: string, startedAt: number): boolean;
  preload<Data = unknown>(key: string, value: Promise<Data> | (() => Promise<Data>)): Promise<Data>;
  setMutation(key: string, value: [number, number]): void;
  setState<Data = unknown, Error = unknown>(
    key: string,
    patch: Partial<CacheState<Data, Error>>,
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
  config: Readonly<Ref<AnyResolvedConfiguration>>;
}

export interface SWRVConfigAccessor {
  cache: CacheAdapter<AnyCacheState>;
  client: SWRVClient;
  config: AnyResolvedConfiguration;
  mutate: ScopedMutator;
  preload: PreloadFunction;
}

export type SWRVConfigComponent = DefineComponent<{
  value?: SWRVConfigurationValue<any, any>;
}> & {
  defaultValue: AnyResolvedConfiguration;
};
