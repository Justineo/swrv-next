# SWR Alignment Gap Investigation

Date: 2026-03-22

## Goal

Perform a thorough investigation of structural drift between SWRV and the local
SWR reference before making another full-scale alignment pass.

## Scope

- module tree and file placement
- public and internal entrypoint shape
- helper naming and ownership
- function placement and logic organization
- advanced feature organization:
  - infinite
  - mutation
  - subscription
- current local helper extractions that may be cleaner locally but drift from
  SWR structure

## Approach

1. Compare the current `packages/swrv/src` tree against the local SWR source
   tree under `/Users/yiling.gu@konghq.com/Developer/Justineo/swr/src`.
2. Inspect boundary-level drift in:
   - `_internal`
   - `index/use-swr*`
   - `infinite`
   - `mutation`
   - `subscription`
3. Identify which differences are:
   - intentional Vue-only requirements
   - acceptable implementation details
   - unnecessary organizational drift that should be realigned
4. Record all observed gaps in a detailed research note before making code
   changes.
