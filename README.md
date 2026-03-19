# SWRV Next

SWRV Next rebuilds SWRV as a modern Vue-native data fetching library aligned
with the current SWR behavior model and shipped from a Vite-era monorepo.

The intended first stable release line for the rewrite is `2.x`. Until that
stable line is tagged, prereleases stay on the `next` dist-tag.

## Workspace

- [`packages/swrv`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/swrv): the published library package
- [`packages/site`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/packages/site): the VitePress documentation site
- [`journey/`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/journey): project memory, plans, and implementation logs

## Development

```bash
vp install
vp check
vp run test -r
vp run test:e2e
vp run build -r
```

Start the docs site:

```bash
vp run site#dev
```

Package dry-run checks:

```bash
cd packages/swrv
vp pm pack -- --json --dry-run
vp pm publish -- --dry-run --access public --provenance --no-git-checks --tag next
```

Contributor workflow and release notes live in
[`CONTRIBUTING.md`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/CONTRIBUTING.md). Security reporting guidance lives in
[`SECURITY.md`](/Users/yiling.gu@konghq.com/Developer/Kong/swrv-next/SECURITY.md).
