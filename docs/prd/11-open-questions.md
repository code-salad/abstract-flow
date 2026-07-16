# 11. Open questions

1. Business model: open-source core + paid team features (sharing, hosted index — Drizzle schema is Postgres-portable for this), or closed commercial from day one?
2. ~~Web app vs. editor extension as the primary surface~~ — resolved: local web app first ([07-ux.md](07-ux.md)); extension can wrap the same `/v1` API later.
3. Launch language confirmation ([05-scope-language.md](05-scope-language.md)) — validate with 10–15 target-user interviews before building.
4. Should v2 add runtime-trace overlay (AppMap-style) to show which static branches actually execute in tests?
5. Monorepo support scope for v1 — single package vs. workspace-aware?
6. v2: MCP server exposing the deterministic index to coding agents — grounds agent code-understanding in verified call graphs instead of hallucinated ones. Validate demand during beta.
