# 5. Scope decision: launch language

**Assumption to validate: v1 = TypeScript/JavaScript (Node/Bun ecosystem).**

Rationale: largest addressable community; the TypeScript compiler API provides real type resolution (making call graphs far more accurate than syntax-only analysis); Express/Nest/Next/Elysia give clear framework entry points; and the "auditing AI-generated code" persona skews heavily JS/TS. Bonus: the tool itself is built in TypeScript (see [08-architecture.md](08-architecture.md)), so it can index its own codebase — dogfooding from day one.

Trade-off acknowledged: dynamic patterns (dependency injection, `require` indirection, `this` rebinding) will produce unresolvable call sites. Per principle 4, these render as explicit "unresolved / N candidates" nodes rather than being silently dropped.

Alternative considered: Python (same reasoning, similar dynamism problems); Java/Go (easier analysis, smaller early-adopter energy). Decision owner: [You].
