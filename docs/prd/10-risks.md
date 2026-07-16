# 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Dynamic JS patterns make many call sites unresolvable, degrading perceived value | High | Type-aware resolution first; explicit ambiguity UI (F11); measure resolution rate per repo and surface it honestly; choose framework-heavy targets (Express/Nest) where patterns are conventional |
| Labels feel too raw ("verbatim condition" reads ugly) | Medium | Labeling priority chain (F9); user-editable label overrides stored in-project as a shareable annotation file |
| Users expect whole-codebase diagrams and are disappointed by entry-point framing | Medium | Onboarding explicitly frames the product as flow tracing; entry-point list makes the model obvious in the first 10 seconds |
| Maintenance cost of parsers killed Sourcetrail | High | One language at launch; lean on maintained infrastructure (TS compiler, tree-sitter, SCIP) instead of bespoke parsers; providers isolated behind ports so a compiler-API upgrade touches one file |
| "No LLM" positioning ages badly if models stop hallucinating on code | Low–Medium | The durable value is *verifiability and speed*, not anti-LLM sentiment; deterministic index could later ground an optional LLM layer (or an MCP server for agents) without compromising the core |
| Telemetry on a tool pointed at private source erodes trust | Medium | OTel/PostHog strictly opt-in, off by default, documented; no source content ever leaves the machine |
