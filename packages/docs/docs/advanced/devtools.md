---
title: Devtools
description: Inspect and instrument SWRV with the built-in debug surface.
---

# Devtools

SWRV includes a lightweight built-in debug surface instead of a full browser extension.

At runtime, SWRV can expose:

- `window.__SWRV_DEVTOOLS_USE__`
- `window.__SWRV_DEVTOOLS_VUE__`

`__SWRV_DEVTOOLS_USE__` is a middleware entry point. `__SWRV_DEVTOOLS_VUE__` exposes the active
Vue module for tooling that needs it.

## What this is for

This surface is meant for:

- debug middleware
- instrumentation
- cache inspection experiments
- future tooling integration

## What this is not

This is not yet a full official browser extension or a deep Vue Devtools integration. Those remain
follow-up work after the stable core is in place.
