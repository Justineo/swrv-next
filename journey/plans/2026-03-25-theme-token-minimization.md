# Theme token minimization

Date: 2026-03-25

## Goal

Reduce the docs theme token layer back to a minimal semantic set while keeping the newly adopted sage, ink, and lime palette.

## Plan

1. Inspect the current expanded token layer in the docs theme stylesheet and identify which variables are truly consumed by the VitePress bridge.
2. Collapse the theme layer to a compact semantic token set that matches the earlier dark-theme style of ownership.
3. Preserve the current palette direction by remapping the remaining semantic tokens instead of keeping the full upstream-style token inventory.
4. Run the expected validation commands and record the outcome in journey logs.
