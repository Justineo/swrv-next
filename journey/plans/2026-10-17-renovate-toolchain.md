# Renovate toolchain upgrade

1. Align Vite+ and its Vite alias at 1.1.0, keep future upgrades grouped, and move CI to Node.js 24.
2. Run the repository checks, tests, builds, browser E2E and package smoke check.
3. Update the existing Renovate PR, merge after CI succeeds, and retire the overlapping alias PR.
