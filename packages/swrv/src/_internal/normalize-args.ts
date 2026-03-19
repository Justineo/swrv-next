import type { HookFetcher } from "./types";

type HookConfig = {
  fetcher?: unknown;
  use?: unknown[];
};

type HookArgs<Key, Data, Config extends HookConfig> =
  | [key: Key]
  | [key: Key, fetcherOrConfig: HookFetcher<Data> | Config | null | false | undefined]
  | [
      key: Key,
      fetcherOrConfig: HookFetcher<Data> | Config | null | false | undefined,
      config: Config | undefined,
    ];

export function normalizeArgs<Key, Data = unknown, Config extends HookConfig = HookConfig>(
  args: HookArgs<Key, Data, Config>,
): [Key, HookFetcher<Data> | null | false | undefined, Config | undefined] {
  const [key, fetcherOrConfig, config] = args;

  if (
    typeof fetcherOrConfig === "function" ||
    fetcherOrConfig === null ||
    fetcherOrConfig === false ||
    fetcherOrConfig === undefined
  ) {
    return [key, fetcherOrConfig, config];
  }

  return [key, null, fetcherOrConfig];
}
