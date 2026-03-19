# Night Owl code theme

- Enabled dual Shiki themes for VitePress code blocks in `packages/site/docs/.vitepress/config.ts`.
- Set `markdown.theme.light` to `night-owl-light` and `markdown.theme.dark` to `night-owl`.
- Rebuilt the docs site and verified the generated output contains `shiki-themes night-owl-light night-owl` plus the expected `--shiki-light-*` and `--shiki-dark-*` variables.
