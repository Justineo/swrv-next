import type {
  KeySource,
  MutatorOptions,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
} from "../_internal/types";

type RemoveUndefined<T> = T extends undefined ? never : T;
type IsUndefinedIncluded<T> = undefined extends T ? true : false;
export type MutationKey<Key extends RawKey> = [Exclude<Key, null | undefined | false>] extends [
  never,
]
  ? Key
  : Exclude<Key, null | undefined | false>;

export interface SWRVMutationConfiguration<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = unknown,
  SWRData = Data,
>
  extends
    Omit<SWRVConfiguration<Data, Error>, "fetcher" | "onError" | "onSuccess">,
    MutatorOptions<SWRData, Data> {
  onError?: (
    error: Error,
    key: string,
    config: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData>,
  ) => void;
  onSuccess?: (
    data: Data,
    key: string,
    config: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData>,
  ) => void;
}

export type MutationFetcher<Data = unknown, Key extends RawKey = RawKey, ExtraArg = unknown> = (
  key: MutationKey<Key>,
  options: { arg: ExtraArg },
) => Data | Promise<Data>;

export interface TriggerWithArgs<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = never,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data | undefined>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options?: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData>,
  ): Promise<Data>;
}

export interface TriggerWithOptionsArgs<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = never,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data | undefined>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg?: ExtraArg,
    options?: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData>,
  ): Promise<Data>;
}

export interface TriggerWithoutArgs<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = never,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: null | undefined,
    options: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data>;
  <CurrentData = SWRData>(
    arg: null | undefined,
    options: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg?: null,
    options?: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, CurrentData>,
  ): Promise<Data>;
}

export interface SWRVMutationResponse<
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = unknown,
  SWRData = Data,
> {
  data: SWRVResponse<Data, Error>["data"];
  error: SWRVResponse<Data, Error>["error"];
  isMutating: SWRVResponse<boolean, never>["data"];
  reset: () => void;
  trigger: [ExtraArg] extends [never]
    ? TriggerWithoutArgs<Data, Error, Key, ExtraArg, SWRData>
    : IsUndefinedIncluded<ExtraArg> extends true
      ? TriggerWithOptionsArgs<Data, Error, Key, ExtraArg, SWRData>
      : TriggerWithArgs<Data, Error, Key, ExtraArg, SWRData>;
}

export type InternalSWRVMutationHook = <
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
  ExtraArg = unknown,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, Key, ExtraArg> | null,
  config?: SWRVMutationConfiguration<Data, Error, Key, ExtraArg, SWRData>,
) => SWRVMutationResponse<Data, Error, Key, ExtraArg, SWRData>;
