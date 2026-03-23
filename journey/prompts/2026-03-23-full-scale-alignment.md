Start a new epic focused on bringing this SWRV codebase into the closest possible structural and behavioral alignment with the latest SWR implementation.

Primary objective:
Align SWRV to SWR module by module, function by function, and logic branch by logic branch. Treat SWR as the source of truth for architecture, control flow, semantics, and internal organization unless a difference is strictly required by the React vs Vue runtime model.

Core rules:

1. Follow SWR as literally as possible.
   - Align file responsibilities, exported surface area, helper boundaries, internal control flow, initialization timing, cleanup behavior, memoization or computed semantics, merge behavior, provider behavior, and edge case handling as closely as the framework difference allows.
   - Do not preserve existing SWRV differences just because they already exist.
   - Do not introduce new abstractions, indirections, or refactors unless they are required to match SWR more closely or to adapt React concepts to Vue correctly.

2. Only allow differences that are truly caused by React vs Vue differences.
   - If a behavior, structure, or branch can be made equivalent in Vue, make it equivalent.
   - If a difference is necessary, keep it minimal and explicitly document why it is unavoidable.
   - “Different style”, “cleaner design”, or “better fit for SWRV” are not valid reasons for divergence unless the React to Vue translation genuinely requires it.

3. Work module by module with strict tracking.
   - Create and maintain a dedicated todo tracker file for this epic, under `journey/plans/`.
   - The tracker must list every relevant module and its status.
   - For each module, track at least:
     - planning
     - implementation
     - review
     - remaining gaps, if any
   - Update this tracker every time meaningful progress is made.
   - As long as the tracker contains any unfinished item, do not stop working.

4. Each module must go through this exact sequence before moving on:
   - Plan
   - Implement
   - Review

Detailed workflow per module:

1. Plan
   - Compare the SWR module and the corresponding SWRV module in detail.
   - Identify all deviations, including:
     - public API differences
     - internal function signatures
     - control flow differences
     - conditional branch differences
     - cache or provider lifecycle differences
     - state management differences
     - cleanup and subscription differences
     - default value behavior
     - config merge behavior
     - naming and file responsibility differences
   - Add a concrete checklist for that module to the tracker.

2. Implement
   - Make the code changes needed to align SWRV with SWR as closely as possible.
   - Prefer direct alignment over local optimization.
   - Preserve Vue correctness, but do not add Vue-specific divergence unless required.
   - Keep the resulting code organization as parallel to SWR as possible.

3. Review
   - Re-read the SWR source and the updated SWRV module side by side.
   - Verify parity at the level of:
     - module purpose
     - exports
     - helper composition
     - function behavior
     - branch behavior
     - lifecycle and cleanup
     - edge cases
   - Record any remaining unavoidable differences in the tracker.
   - Only mark the module complete when the remaining differences are truly framework-required.

Execution standards:

- Be exhaustive.
- Be literal.
- Be skeptical of every existing difference.
- Do not settle for “roughly equivalent”.
- Do not stop at matching behavior if the structure can also be aligned more closely.
- Do not stop at matching structure if branch behavior still differs.
- Do not skip small branches, fallback paths, provider semantics, or cleanup details.

Important constraints:

- Unless the difference is directly caused by React vs Vue, there is no need for differentiated implementation.
- If SWR has a simpler or more direct structure, prefer that structure.
- If SWRV currently has extra layers, wrappers, helper files, or alternate flows that are not necessary, remove or collapse them when doing so improves alignment with SWR.
- Keep naming, file boundaries, and logical decomposition as close to SWR as possible within Vue conventions.

Required artifact:
Maintain the tracker file continuously throughout the epic. It must always reflect the current real state of work. Never let it become stale.

Stopping condition:
Do not end the current turn after finishing only part of the work.
Do not stop after a single module.
Do not stop after updating the tracker.
Do not stop after implementation without review.
Only end the current turn when all modules in the tracker have gone through plan, implement, and review, and there are no unfinished items left in the tracker.

Final requirement:
This epic is not complete until the entire tracked scope is finished. If any module, function, branch, or recorded gap remains unfinished, continue working instead of concluding the turn.
