# Codeflow

Deterministic code flow visualization — navigable, branch-level control flow
graphs derived from the TypeScript AST. No LLM anywhere in the pipeline: if the
tool shows an edge, that edge exists in the source. See [docs/prd](docs/prd/README.md).

| Path | What |
|---|---|
| `server/` | Bun + Elysia API — the analysis engine (FCIS: pure `core/`, I/O in `shell/`) |
| `web/` | Next.js 16 + React 19 — the flow canvas |
| `examples/express-demo/` | Small fixture repo to index |

Prerequisites: [Bun](https://bun.sh), [just](https://github.com/casey/just).

```sh
just setup
just dev-server   # API on :3000
just dev-web      # UI on :3002 — open, point it at examples/express-demo
```
