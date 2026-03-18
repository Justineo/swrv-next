# SWRV Next

SWRV Next rebuilds SWRV as a modern Vue-native data fetching library aligned
with the current SWR behavior model and shipped from a Vite-era monorepo.

## Workspace

- [`packages/swrv`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv): the published library package
- [`packages/docs`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/docs): the VitePress documentation site
- [`journey/`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/journey): project memory, plans, and implementation logs

## Development

```bash
vp install
vp check
vp run test -r
vp run build -r
```

Start the docs site:

```bash
vp run docs#dev
```
