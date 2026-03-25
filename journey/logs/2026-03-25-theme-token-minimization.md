# Theme token minimization

Date: 2026-03-25

## Progress

- Started from the expanded semantic token bridge added earlier on 2026-03-25.
- Reducing the docs token owner back toward the smaller light and dark token pattern used before the full-palette pass.
- Replaced the large palette-style token inventory in `packages/site/docs/.vitepress/theme/index.css` with a compact semantic token set for `bg`, `title`, `text`, `primary`, `secondary`, borders, inputs, nav, and status colors.
- Kept the sage, ink, and lime palette direction, but pushed the rest of the surface shaping back into the shared VitePress `--vp-*` bridge instead of storing extra `--theme-*` aliases.
- Refined the minimal dark-mode token set again so it now preserves the supplied dark semantics that actually matter at runtime: lime links, a separate dark surface token, and black secondary buttons with lime borders.

## Validation

- `vp check --fix`
- `vp test`
- `vp run site#build`
