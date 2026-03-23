import useSWRV from "./use-swr";

export default useSWRV;

export { SWRConfig } from "./config";
export { unstable_serialize } from "./serialize";
export { mutate, preload, useSWRConfig } from "../_internal";

export interface SWRVGlobalConfig {}
export type SWRGlobalConfig = SWRVGlobalConfig;

export type {
  Arguments,
  BareFetcher,
  Cache,
  Compare,
  Fetcher,
  Key,
  KeyedMutator,
  Middleware,
  MutatorCallback,
  MutatorOptions,
  ScopedMutator,
  SWRConfiguration,
  SWRResponse,
  State,
  SWRVConfiguration,
  SWRVMiddleware,
  SWRVResponse,
} from "../_internal";
export type { SWRHook, SWRVHook } from "./use-swr";
