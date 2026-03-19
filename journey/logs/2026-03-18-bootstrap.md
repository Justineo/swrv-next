You are working in a freshly created Vite-based monorepo. The goal of this project is to rebuild **SWRV** as a modern, well-maintained Vue-native counterpart to **SWR**.

## Project Context

SWRV is the Vue port of SWR, but it has not been actively maintained for a long time and has gradually drifted away from SWR in behavior, API design, tooling, and type quality.

I have prepared a document that summarizes the current differences between the two projects:

- `journey/research/swr-vs-swrv.md`

Please use that document as an important reference.

You can also refer to the latest local source code for both projects here:

- `~/Developer/Justineo/swr`
- `~/Developer/Kong/swrv`

## What We Want to Achieve

The new version of SWRV should aim for the following:

1. **Modernize the entire technical stack**
   - The current SWRV stack is outdated and built around Yarn 1, Vue CLI, webpack 4, Babel, Jest, and similar legacy tooling.
   - I want the project to be fully modernized around a Vite-era stack.

2. **Align the API with SWR as closely as possible**
   - SWRV should match SWR's API and behavior as faithfully as possible.
   - At the same time, the implementation should be idiomatic and Vue-native rather than a literal React-style port.

3. **Greatly improve TypeScript types**
   - The current SWRV type definitions are relatively rough.
   - I want the new version to provide precise, high-quality typings based on the latest TypeScript capabilities.

4. **Add comprehensive automated testing**
   - The project should include complete unit test coverage and end-to-end test coverage.
   - Prefer a Vite-native testing setup, using the modern Vite and Vitest ecosystem wherever possible.

5. **Rewrite the documentation with modern tooling**
   - The docs should be rewritten using the latest version of VitePress.

6. **Restructure the repo as a monorepo**
   - The repo should be organized as:
     - `packages/swrv`
     - `packages/site`
   - These should correspond to the library itself and the documentation site.

7. **Set up automated dependency maintenance**
   - Add a Renovate-based dependency update workflow.

8. **Modernize release and publishing workflows**
   - Integrate npm Trusted Publisher.
   - Use a modern release flow for version bumping, GitHub Releases, and npm publishing.

9. **Make the project friendly for coding agents**
   - The repo should always contain an up-to-date design and decision record document.
   - This document should clearly capture requirements, architecture, tradeoffs, and key decisions so future coding agents can quickly understand the project state.

## Your Task Right Now

Do **not** start implementing anything yet.

First, step back and figure out how this entire effort should be decomposed.

I want you to think through:

- How the work should be broken down into major streams
- What should happen first, what should happen later
- What major milestones we should define
- Which parts can be parallelized
- Which parts are good candidates for delegation to subagents
- What dependencies, risks, or sequencing constraints exist across workstreams

After you establish the full picture, provide a **comprehensive high-level plan** that covers the project end to end.

## Expected Output

Please produce a planning document that includes, at minimum:

1. **Project decomposition**
   - The major workstreams required to rebuild SWRV

2. **Recommended sequencing**
   - What should be done first, second, and so on
   - Why that order makes sense

3. **Milestones**
   - A clear set of large milestones for the project
   - Each milestone should have a concrete objective and expected outcome

4. **Parallelization opportunities**
   - Which workstreams can run in parallel
   - Which ones should remain sequential
   - Which tasks are suitable for subagents

5. **Risks and unknowns**
   - Key technical or product uncertainties
   - Anything that should be validated early

6. **High-level execution plan**
   - A realistic, end-to-end roadmap that fully covers the rebuild

## Planning Principles

Please ground the plan in these principles:

- SWR should be treated as the primary behavioral and API reference
- The result should still feel truly native to Vue
- Tooling, typing, testing, docs, DX, CI/CD, release engineering, and long-term maintainability all matter
- The output should optimize for building a modern open source library, not just porting code
- The plan should be practical for an agent-driven workflow inside this repo

Start by reading the difference document and examining the current SWR and SWRV codebases, then produce the full high-level plan.
