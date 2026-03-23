import type { ResolvedSWRVConfiguration, SWRVConfiguration } from "../types";

export function mergeConfigs<Data = unknown, Error = unknown>(
  base: ResolvedSWRVConfiguration<Data, Error>,
  override?: SWRVConfiguration<Data, Error>,
): ResolvedSWRVConfiguration<Data, Error> {
  const merged = {
    ...base,
    ...override,
  } satisfies ResolvedSWRVConfiguration<Data, Error>;

  if (override) {
    const { use: baseUse, fallback: baseFallback } = base;
    const { use: overrideUse, fallback: overrideFallback } = override;

    if (baseUse && overrideUse) {
      merged.use = baseUse.concat(overrideUse);
    }

    if (baseFallback && overrideFallback) {
      merged.fallback = {
        ...baseFallback,
        ...overrideFallback,
      };
    }
  }

  return merged;
}
