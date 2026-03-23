import { useSWRVContext } from "../config-context";

import type { AnyResolvedConfiguration } from "./types";

export function useSWRConfig(): AnyResolvedConfiguration {
  return useSWRVContext().config.value;
}
