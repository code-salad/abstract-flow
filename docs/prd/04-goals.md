# 4. Goals and non-goals

## Goals (v1)

- G1: From a cold repo checkout, index and render the CFG of any function in the project.
- G2: Trace a flow across function boundaries at least 5 levels deep with breadcrumb navigation.
- G3: Deterministic block labels — never generated, always derived (see [06-requirements.md §6.3](06-requirements.md)).
- G4: Framework-aware entry-point detection for at least one framework (e.g., Express routes), so users start from "what happens on `POST /checkout`" rather than a file tree.
- G5: Time-to-first-flow under 2 minutes for a 100k-LOC repo on a laptop.

## Non-goals (v1)

- Whole-codebase architecture diagrams / dependency hairballs.
- Runtime tracing (AppMap-style). Static only; runtime is a possible v2 complement.
- LLM-generated summaries or explanations, in any form.
- Editing code, refactoring suggestions, linting.
- Multi-language support beyond the launch language (see [05-scope-language.md](05-scope-language.md)).
