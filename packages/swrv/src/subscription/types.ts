import type {
  KeySource,
  MutatorCallback,
  RawKey,
  SWRVConfiguration,
  SWRVResponse,
} from "../_internal/types";

export interface SWRVSubscriptionOptions<Data = unknown, Error = unknown> {
  next: (error?: Error | null, data?: Data | MutatorCallback<Data>) => void;
}

export type SWRVSubscription<Data = unknown, Error = unknown, Key extends RawKey = RawKey> = (
  key: Exclude<Key, null | undefined | false>,
  options: SWRVSubscriptionOptions<Data, Error>,
) => () => void;

export interface SWRVSubscriptionResponse<Data = unknown, Error = unknown> {
  data: SWRVResponse<Data, Error>["data"];
  error: SWRVResponse<Data, Error>["error"];
}

export type InternalSWRVSubscriptionHook = <
  Data = unknown,
  Error = unknown,
  Key extends RawKey = RawKey,
>(
  key: KeySource<Key>,
  subscribe: SWRVSubscription<Data, Error, Key>,
  config?: SWRVConfiguration<Data, Error>,
) => SWRVSubscriptionResponse<Data, Error>;
