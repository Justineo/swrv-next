import { getDevtoolsUse } from "./devtools";

import type { SWRVHook, SWRVMiddleware } from "./types";

export function resolveMiddlewareStack(
  parentConfig: { use: SWRVMiddleware[] },
  override?: { use?: SWRVMiddleware[] },
): SWRVMiddleware[] {
  const middlewares = getDevtoolsUse();
  const parentUse = parentConfig.use;
  const localUse = override?.use;

  if (parentUse.length === 0 && (!localUse || localUse.length === 0)) {
    return middlewares;
  }

  return middlewares.concat(parentUse, localUse ?? []);
}

export function applyMiddleware(hook: SWRVHook, middlewares: readonly SWRVMiddleware[]): SWRVHook {
  let next = hook;

  for (let index = middlewares.length - 1; index >= 0; index -= 1) {
    next = middlewares[index](next);
  }

  return next;
}

export function applyFeatureMiddleware<Hook>(
  hook: Hook,
  middlewares: readonly SWRVMiddleware[],
): Hook {
  let next = hook as unknown as SWRVHook;

  for (let index = middlewares.length - 1; index >= 0; index -= 1) {
    next = middlewares[index](next);
  }

  return next as unknown as Hook;
}
