Perform a deep repository analysis pass on the codebase path provided at the very end of this prompt.

The final non-empty line of this prompt is the target codebase path.
Treat it as the source of truth.
Do not ask for clarification.
Do not modify the codebase.
Do not install dependencies unless absolutely necessary.
Prefer reading files and analyzing structure over executing the project.
If the repository is very large, sample intelligently across the most important and representative areas.

Your task is to reverse-engineer the repository's real engineering preferences and produce a high-signal "Codebase DNA Report" that another coding agent can use to write code that feels native to this repository.

Your goal is not to produce generic best practices.
Your goal is to extract the actual conventions, defaults, tradeoffs, and instincts of this specific codebase, based on evidence from repeated patterns in the repository.

## Primary objective

Deeply analyze the codebase and extract as many of its coding preferences as possible, including but not limited to:

- naming conventions
- directory and file organization
- module boundaries
- ownership patterns
- logic placement
- abstraction style
- utility placement
- local ownership vs centralized shared helpers
- type declaration style
- data modeling style
- API design
- testing style
- import structure
- reuse vs duplication heuristics
- component or class design style
- async and error handling patterns
- framework idioms
- readability conventions
- signs of current architectural direction
- implicit engineering values and tradeoffs

## Operating instructions

Work in this order:

1. Inspect the repository structure first.
   - Identify major directories, packages, apps, libraries, feature areas, and architectural layers.
   - Identify whether the repo is monolithic, monorepo, package-based, domain-oriented, layer-oriented, route-oriented, or hybrid.

2. Inspect repository-level evidence.
   Review files such as:
   - package manifests
   - workspace config
   - tsconfig / jsconfig
   - lint config
   - formatter config
   - test config
   - build config
   - CI config
   - contribution docs
   - architecture docs
   - README files
     Use these as evidence, but do not rely on them alone.

3. Inspect representative code across major areas.
   Sample broadly and intelligently:
   - shared/core modules
   - feature-specific modules
   - entrypoints
   - domain logic
   - UI or presentation code if present
   - state management code if present
   - data access code
   - tests
   - utilities
   - recently active or central files if detectable

4. Infer patterns from repetition.
   - Prefer repeated patterns over isolated ones.
   - Separate dominant conventions from local exceptions.
   - Separate current patterns from legacy or transitional ones.
   - Distinguish global conventions from folder-specific conventions.

5. Convert findings into operational guidance.
   Your final output must help a future coding agent implement new code that blends into this repository naturally.

## Analysis standards

- Do not hallucinate conventions.
- Do not generalize from one file.
- Do not state a preference unless there is evidence.
- If evidence is mixed, explicitly say so.
- If conventions differ by area, explain the scope of each convention.
- Prefer recent and actively used code when inferring current preferences.
- Focus on conventions that materially affect how new code should be written.

## What to extract

Extract as many of these dimensions as possible.

### 1. Repository structure

- how the repo is divided
- domain-oriented vs technical-layered vs hybrid structure
- package boundaries
- folder depth and nesting habits
- colocation patterns
- where new code is expected to live

### 2. File organization

- one-concept-per-file vs multi-purpose files
- typical file size and responsibility
- ordering inside files
- export patterns
- whether helpers/types/constants stay in the same file or get split out

### 3. Naming

- variables
- functions
- classes
- components
- hooks/composables
- files
- directories
- types/interfaces
- enums/constants
- booleans
- async functions
- event names
- private vs public naming patterns

### 4. Ownership and module boundaries

- what belongs inside a module
- what gets extracted
- when utilities are shared
- when helpers stay local
- cross-feature import behavior
- private vs public module surfaces
- boundary discipline

### 5. Logic placement

- where business logic lives
- where presentation logic lives
- where data fetching lives
- where validation lives
- where transformation/mapping lives
- where orchestration lives
- where side effects live

### 6. Type system style

- strictness level
- inference vs explicit annotation
- type vs interface preferences
- generics usage
- discriminated unions
- utility types
- runtime schema usage
- colocated vs centralized types
- external API types vs internal domain types
- nullability handling
- type naming patterns

### 7. Data modeling

- entity shape conventions
- normalized vs denormalized structures
- mutable vs immutable style
- DTOs vs domain models
- mapper/adapter patterns
- parsing/serialization patterns
- naming consistency for domain concepts

### 8. Control flow and error handling

- guard clauses vs nesting
- exception usage vs result objects
- defensive style vs happy-path style
- logging conventions
- retry/fallback patterns
- async error propagation
- cancellation/timeouts if present

### 9. State and effects

- local vs shared state
- store patterns
- derived state style
- server state vs client state separation
- caching conventions
- effect isolation
- event-driven patterns if present

### 10. Dependency and import style

- import ordering
- alias usage
- absolute vs relative imports
- barrel files vs direct imports
- third-party dependency wrappers
- dependency direction across layers
- circular dependency avoidance patterns

### 11. Reuse and abstraction heuristics

- how much duplication is tolerated
- when an abstraction is introduced
- preferred abstraction shapes
- preference for low-level primitives vs opinionated helpers
- signals that shared utilities are intentionally avoided
- common over-abstractions the repo seems to reject

### 12. Framework idioms

- how the framework is actually used in this repo
- component patterns
- routing conventions
- store/composable/hook conventions
- lifecycle usage
- data loading conventions
- framework-specific anti-patterns avoided

### 13. API and boundary design

- function signatures
- options objects vs positional parameters
- return value conventions
- defaulting patterns
- extensibility points
- adapter/facade patterns
- public contract stability habits

### 14. Testing philosophy

- what gets tested
- unit vs integration preference
- test file placement
- test naming
- fixture/factory patterns
- mocking style
- what tests reveal about intended architecture

### 15. Comments and documentation

- when comments are used
- what comments explain
- whether naming carries most documentation burden
- README or ADR usage
- inline rationale patterns

### 16. Readability style

- whitespace and density
- chaining style
- destructuring habits
- early return habits
- constant placement
- branching style
- object construction style
- function length tolerance

### 17. Evolution patterns

- evidence of newer preferred styles
- deprecated or legacy styles still present
- migrations in progress
- current direction of the architecture

### 18. Implicit engineering values

Infer likely repository values such as:

- maintainability
- speed of iteration
- local reasoning
- explicitness
- type safety
- testability
- performance
- ergonomics
- separation of concerns
- API stability

## Deliverable requirements

Produce a single Markdown report named:

CODEBASE_DNA_REPORT.md

Also print a concise summary to stdout at the end.

The report must use this structure:

# Codebase DNA Report

## A. Executive summary

A concise summary of the most important stylistic and architectural preferences that define the repository.

## B. High-confidence conventions

For each high-confidence convention include:

- Convention
- What it means in practice
- Why it appears preferred here
- Evidence
- Confidence

## C. Detailed convention map

Group findings by category.
For each category include:

- Dominant pattern
- Secondary pattern or exceptions
- Evidence
- Practical rule for future code generation

## D. Preference rules for future code generation

Write explicit rules another coding agent can follow, such as:

- Prefer X over Y when ...
- Colocate A with B unless ...
- Extract shared helpers only when ...
- Use explicit types for ...
- Keep feature-specific logic inside ...

## E. Decision heuristics

Extract concrete heuristics for ambiguous situations, such as:

- when to create a new module
- when to create a utility
- when to inline logic
- when to generalize
- when to create shared types
- when to split files
- when to add comments

## F. Anti-patterns and styles that likely do not belong here

Only include items supported by repository evidence.

## G. Tension points and unresolved inconsistencies

Explain competing patterns, migrations, or inconsistent areas, and indicate which pattern appears dominant.

## H. Representative examples

Give a small number of representative examples from the repository.
Do not paste large code excerpts.
Briefly explain why each example is representative.

## I. How to write code that belongs here

Write a compact, high-signal guide for a future coding agent.

## J. Evidence appendix

Include:

- key directories inspected
- representative files inspected
- any limitations of the analysis
- areas where confidence is lower

## Evidence rules

- Ground all important claims in actual repository evidence.
- Reference specific files or directories where useful.
- Prefer breadth plus repetition over deep focus on a single file.
- If the repository contains conflicting styles, explain the conflict instead of flattening it.
- Treat implemented code as the primary source of truth.

## Execution constraints

- Do not modify source files.
- Do not create anything except the report file.
- Do not run broad destructive commands.
- Do not install or upgrade dependencies unless absolutely required for reading the repository.
- Prefer shell inspection and file reading.
- If the repo is huge, prioritize representative sampling and make that explicit in the report.

## Suggested workflow

You may use a workflow like:

- inspect top-level tree
- inspect config and manifest files
- identify major code areas
- sample representative files from each area
- compare repeated patterns
- infer dominant conventions
- write report

## Final instruction

This should not read like a generic style guide.
It should read like a distilled operational model of this specific repository, derived from deep inspection, and optimized for helping another coding agent generate code that fits in naturally.

Now begin the analysis.
