# Rename docs package to site

Date: 2026-03-19

## Goal

Rename the documentation workspace package from `docs` to `site` so the package name, workspace path, and task targets are aligned.

## Changes

- Moved the docs workspace from `packages/docs` to `packages/site`.
- Renamed the workspace package from `docs` to `site`.
- Updated workspace references such as `vp run docs#dev` to `vp run site#dev`.
- Rewrote repository, documentation, and journey references from `packages/docs` to `packages/site`.
- Refreshed the workspace lockfile and importer metadata with `vp install`.

## Validation

- `vp install`
- `vp check`
- `vp test`
- `vp run build -r`
