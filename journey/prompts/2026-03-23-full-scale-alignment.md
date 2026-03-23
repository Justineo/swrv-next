Start a new epic to align this SWRV codebase as closely as possible with the latest SWR implementation.

Context:
A v2 rewrite has already been done using SWR as the reference, and several follow-up alignment passes have improved module boundaries and major logic flow. However, there are still many unnecessary deviations in module structure, function design, control flow, and branch behavior. The goal of this epic is to remove those deviations as thoroughly as possible.

Goal:
Use SWR as the source of truth and align SWRV module by module, function by function, and logic branch by logic branch. Unless a difference is strictly required by React vs Vue runtime differences, do not keep or introduce divergent implementations.

Rules:

1. Follow SWR as literally as possible.
   - Align module responsibility, exports, helper boundaries, control flow, lifecycle, cleanup, config merging, cache and provider behavior, and edge case handling.
   - Do not preserve existing SWRV differences just because they already exist.
   - Do not introduce new abstractions or SWRV-specific redesigns unless they are required to match SWR more closely or to translate React behavior correctly into Vue.

2. Only allow differences that are truly caused by React vs Vue differences.
   - If something can be equivalent in Vue, make it equivalent.
   - If a difference is unavoidable, keep it minimal and document it clearly.

3. Create and maintain a tracker file for this epic, under `journey/plans`.
   - Track every relevant module.
   - For each module, record: plan, implement, review, feedback, remaining gaps, and completion status.
   - Update this file whenever meaningful progress is made.
   - If the tracker contains any unfinished item, do not stop working.

Workflow for each module:
Plan -> Implement -> Review -> Address feedback

Module requirements:

- Plan: compare the SWR module and the SWRV module in detail, identify all deviations, and write a concrete checklist in the tracker.
- Implement: apply the changes needed to align SWRV with SWR as literally as possible, except where Vue vs React differences make that impossible.
- Review: compare the updated SWRV module against SWR again and identify all remaining deviations, including small structural, behavioral, lifecycle, and branch-level differences.
- Address feedback: fix every issue found during review before the module is considered complete.

Completion rules:

- A module is not complete until all review feedback has been addressed.
- If addressing feedback causes material code changes, review that module again before marking it complete.
- Only then may you move to the next module.

Execution expectations:

- Be exhaustive.
- Do not settle for rough equivalence.
- Do not stop at high-level behavior if structure can be aligned more closely.
- Do not skip small branches, fallback paths, cleanup behavior, provider semantics, or config details.
- Be skeptical of every existing SWRV difference and treat it as unnecessary unless proven to be required by React vs Vue differences.

Stopping condition:
Do not stop after planning, implementation, review, tracker updates, or a single module. Do not end the current turn until the full tracked scope is complete. As long as any module, function, logic branch, or tracked gap remains unfinished, continue working. Only end the current turn when all tracked modules are complete and no unfinished items remain in the tracker.
