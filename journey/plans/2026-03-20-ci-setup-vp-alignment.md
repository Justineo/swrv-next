# CI setup-vp alignment

1. Replace manual GitHub Actions Node and Vite+ setup with the official `voidzero-dev/setup-vp@v1` path.
2. Restore plain `vp` commands for all CI lanes, including the package dry-run.
3. Update the design snapshot to remove the workaround explanation and record the official CI model.
4. Re-run local validation to prove the workflow commands still work end to end.
