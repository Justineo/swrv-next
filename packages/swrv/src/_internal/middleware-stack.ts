import { getDevtoolsUse } from "./devtools";

import type { ResolvedSWRVConfiguration, SWRVConfiguration, SWRVMiddleware } from "./types";

export function resolveMiddlewareStack(
  parentConfig: ResolvedSWRVConfiguration<any, any>,
  override?: SWRVConfiguration<any, any>,
): SWRVMiddleware[] {
  const middlewares = getDevtoolsUse();
  const parentUse = parentConfig.use;
  const localUse = override?.use;

  if (parentUse.length === 0 && (!localUse || localUse.length === 0)) {
    return middlewares;
  }

  return middlewares.concat(parentUse, localUse ?? []);
}
