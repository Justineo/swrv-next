import type {
  KeySource,
  MutatorOptions,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
} from "../_internal/types";

type RemoveUndefined<T> = T extends undefined ? never : T;
type IsUndefinedIncluded<T> = undefined extends T ? true : false;

export interface SWRVMutationConfiguration<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>
  extends
    Omit<SWRVConfiguration<Data, Error>, "fetcher" | "onError" | "onSuccess">,
    MutatorOptions<SWRData, Data> {
  onError?: (
    error: Error,
    key: Key,
    config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData>,
  ) => void;
  onSuccess?: (
    data: Data,
    key: Key,
    config: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData>,
  ) => void;
}

export type MutationFetcher<Data = unknown, ExtraArg = unknown, Key extends RawKey = RawKey> = (
  key: Key,
  options: { arg: ExtraArg },
) => Data | Promise<Data>;

export interface TriggerWithArgs<
  Data = unknown,
  Error = unknown,
  ExtraArg = never,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data | undefined>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData>,
  ): Promise<Data>;
}

export interface TriggerWithOptionsArgs<
  Data = unknown,
  Error = unknown,
  ExtraArg = never,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data | undefined>;
  <CurrentData = SWRData>(
    arg: ExtraArg,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg?: ExtraArg,
    options?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData>,
  ): Promise<Data>;
}

export interface TriggerWithoutArgs<
  Data = unknown,
  Error = unknown,
  ExtraArg = never,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  <CurrentData = SWRData>(
    arg: null | undefined,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: false;
    },
  ): Promise<Data>;
  <CurrentData = SWRData>(
    arg: null | undefined,
    options: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData> & {
      throwOnError: true;
    },
  ): Promise<RemoveUndefined<Data>>;
  <CurrentData = SWRData>(
    arg?: null,
    options?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, CurrentData>,
  ): Promise<Data>;
}

export interface SWRVMutationResponse<
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
> {
  data: SWRVResponse<Data, Error>["data"];
  error: SWRVResponse<Data, Error>["error"];
  isMutating: SWRVResponse<boolean, never>["data"];
  reset: () => void;
  trigger: [ExtraArg] extends [never]
    ? TriggerWithoutArgs<Data, Error, ExtraArg, Key, SWRData>
    : IsUndefinedIncluded<ExtraArg> extends true
      ? TriggerWithOptionsArgs<Data, Error, ExtraArg, Key, SWRData>
      : TriggerWithArgs<Data, Error, ExtraArg, Key, SWRData>;
}

export type SWRVMutationHook = <
  Data = unknown,
  Error = unknown,
  ExtraArg = unknown,
  Key extends RawKey = RawKey,
  SWRData = Data,
>(
  key: KeySource<Key>,
  fetcher: MutationFetcher<Data, ExtraArg, Key> | null,
  config?: SWRVMutationConfiguration<Data, Error, ExtraArg, Key, SWRData>,
) => SWRVMutationResponse<Data, Error, ExtraArg, Key, SWRData>;
