import { getDevtoolsUse, use as devtoolsUse } from "./devtools";
import { middleware as preload } from "./preload";

export const BUILT_IN_MIDDLEWARE = devtoolsUse.concat(preload);

export function getBuiltInMiddleware() {
  return getDevtoolsUse().concat(preload);
}
