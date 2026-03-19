# Docs site redesign

Date: 2026-03-19

## Goal

Replace the earlier docs presentation with a higher-quality, more minimal design that feels
intentional, uses Kong-flavored visual cues, and matches the requested black plus lime
AI-connectivity theme without drifting into generic gradient-heavy UI.

## What changed

- replaced the previous teal and ember docs styling with a dark-first system built on the provided
  Roboto and Space Grotesk pairing, black surfaces, lime accents, thin borders, and compact code
  blocks
- rebuilt the home route into a minimal product page with a slim header, restrained hero, compact
  code panel, and SWR-like documentation entry points
- replaced the old placeholder mark with a ribbon-style SWRV logo closer to the provided artwork
- removed `compatibility-and-status.md`
- replaced `migration-from-swrv.md` with `migrate-from-v1.md`
- updated the navbar and sidebar so the information architecture stays close to the upstream SWR
  docs model while surfacing migration as the explicit legacy entry point

## Follow-up refinement

- restored light mode support instead of keeping the site dark-only
- improved brand-button contrast in dark mode
- simplified the home page to only the core hero copy, installation command, and minimal usage
  example

## Validation

- `vp check`
- `vp run ready`
- manual browser review on desktop and mobile through VitePress preview
