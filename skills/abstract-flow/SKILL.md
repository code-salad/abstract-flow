---
name: abstract-flow
description: Deterministic, AST-backed TypeScript control-flow and call-graph inspection with compact CLI output and SVG export. Use when debugging or understanding routes, entrypoints, callers, callees, branches, loops, exits, unresolved calls, or when generating a flow diagram for documentation or a pull request.
---

# Abstract Flow

Use the `abstract-flow` CLI for structural code questions that literal text
search cannot answer cheaply. Use `rg` for literal text.

## Workflow

- Start with `abstract-flow entrypoints --repo .`.
- Use the exact function ID it returns with `flow` or `refs`.
- Use `flow <id> --depth 0` for a compact branch summary; increase depth only when needed.
- Use `refs <id> --direction callers` for impact and `--direction callees` for dependencies.
- Use `search` for AST-aware relationships and outcomes. Keep `--limit` bounded.
- Treat unresolved and dynamic calls as unknown; never infer a missing edge.
- Read source only at reported file/line anchors when the graph is insufficient.

## Commands

```sh
abstract-flow entrypoints --repo .
abstract-flow flow '<file>#<function>:<line>' --repo . --depth 0
abstract-flow refs '<file>#<function>:<line>' --direction both --repo . --json
abstract-flow search --kind exit --outcome throw --repo . --limit 50
abstract-flow svg '<file>#<function>:<line>' --repo . --depth 1 -o docs/flows/<name>.svg
```

The CLI is Bun-only. `bunx abstract-flow` starts the bundled production
Next.js build on ports `41730` (web) and `41731` (API); override them with
`--port` and `--api-port`.

Use `--json` when another command must consume the result. Keep source bodies
out of agent output unless explicitly needed.

## Install and uninstall

Install the project dependency with `bun add --dev abstract-flow`, or run it
without a project dependency with `bunx abstract-flow`.

If asked to uninstall the CLI from a project, run `bun remove abstract-flow`.
If it was only run with `bunx`, there is no project dependency to remove.

Install this skill from the published repository with:

```sh
git clone --depth 1 --branch beta https://github.com/code-salad/abstract-flow.git /tmp/abstract-flow
cp -R /tmp/abstract-flow/skills/abstract-flow <agent-skill-root>/abstract-flow
rm -rf /tmp/abstract-flow
```

If asked to uninstall this skill, remove only its installed skill directory:

```sh
rm -rf <agent-skill-root>/abstract-flow
```

Leave project code and generated flow diagrams untouched.
