import { defaultConfig } from "./config";
import { useSWRVContext } from "./config-context";

import type { AnyResolvedConfiguration } from "../types";

export function useSWRConfig(): AnyResolvedConfiguration {
  return {
    ...defaultConfig,
    ...useSWRVContext().config.value,
  };
}
