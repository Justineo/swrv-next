import * as Vue from "vue";

import type { SWRVMiddleware } from "../types";

declare global {
  interface Window {
    __SWRV_DEVTOOLS_USE__?: SWRVMiddleware[];
    __SWRV_DEVTOOLS_VUE__?: typeof Vue;
  }
}

const enableDevtools = typeof window !== "undefined" && Array.isArray(window.__SWRV_DEVTOOLS_USE__);

export const use: SWRVMiddleware[] = enableDevtools ? (window.__SWRV_DEVTOOLS_USE__ ?? []) : [];

export function getDevtoolsUse(): SWRVMiddleware[] {
  if (typeof window === "undefined" || !Array.isArray(window.__SWRV_DEVTOOLS_USE__)) {
    return [];
  }

  window.__SWRV_DEVTOOLS_VUE__ = Vue;
  return window.__SWRV_DEVTOOLS_USE__;
}

export function setupDevTools(): void {
  if (enableDevtools) {
    window.__SWRV_DEVTOOLS_VUE__ = Vue;
  }
}
