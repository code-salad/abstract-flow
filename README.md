# Abstract Flow

Deterministic code flow visualization — navigable, branch-level control flow
graphs derived from the TypeScript AST. No LLM anywhere in the pipeline: if the
tool shows an edge, that edge exists in the source. See [docs/prd](docs/prd/README.md).

## Run it

Abstract Flow is one Bun package with two entry points: a CLI that runs the local UI
and API together, and a server export for embedding in another Bun service.

```sh
bunx abstract-flow
# UI: http://localhost:41730
# API: http://localhost:41731
# Uses the bundled production Next.js build
```

To install it as a project dependency instead:

```sh
bun add --dev abstract-flow
bunx abstract-flow
```

Remove a project-local installation with:

```sh
bun remove abstract-flow
```

If you only used `bunx`, there is no project dependency to remove.

### Agent CLI

Analysis commands stay in the terminal and do not start the web server:

```sh
bunx abstract-flow entrypoints --repo .
bunx abstract-flow flow 'src/routes.ts#list:12' --repo . --depth 0
bunx abstract-flow refs 'src/routes.ts#list:12' --direction callers --repo .
bunx abstract-flow search --kind exit --outcome throw --repo . --limit 20
```

Use `--json` for machine-readable output. Generate a standalone SVG that can
be committed to documentation or attached to a pull request:

```sh
bunx abstract-flow svg 'src/routes.ts#list:12' --repo . --depth 1 \
  -o docs/flows/list.svg
```

The SVG renderer is deterministic and has no Graphviz or browser dependency.

### Agent skill

Copy `skills/abstract-flow/` into the skill directory your coding agent scans.

```sh
git clone --depth 1 --branch beta https://github.com/code-salad/abstract-flow.git /tmp/abstract-flow
cp -R /tmp/abstract-flow/skills/abstract-flow <agent-skill-root>/abstract-flow
rm -rf /tmp/abstract-flow
```

To uninstall the skill, remove only that installed directory:

```sh
rm -rf <agent-skill-root>/abstract-flow
```

Leave project code and generated flow diagrams untouched.

To embed only the server:

```ts
import { app } from "abstract-flow";

app.listen(3000);
```

The package requires [Bun](https://bun.sh) and is published as
`abstract-flow` on npm.

Website: [code-salad.github.io/abstract-flow](https://code-salad.github.io/abstract-flow/)

| Path | What |
|---|---|
| `server/` | Bun + Elysia API — the analysis engine (FCIS: pure `core/`, I/O in `shell/`) |
| `web/` | Next.js 16 + React 19 — the flow canvas |
| `site/` | Static Next.js public site, exported for GitHub Pages |
| `bin/` | Thin CLI launcher for the local API and UI |
| `examples/express-demo/` | Small fixture repo to index |

## Develop locally

Prerequisites: [Bun](https://bun.sh), [just](https://github.com/casey/just).

```sh
just setup
just dev-server   # API on :3000
just dev-web      # UI on :3002 — automatically indexes this repo
just dev-site     # public static site on :3003
```

## Release and deployment

- `alpha` is the default integration branch. Open feature pull requests against it.
- `beta` is the release branch. Promote `alpha` to `beta` when preparing a release.
- [Release Please](https://github.com/googleapis/release-please) opens the version/changelog pull request on `beta`; after the npm trusted-publishing bootstrap, merging it publishes `abstract-flow`.
- The Pages workflow builds `site/` from `beta` and deploys to [code-salad.github.io/abstract-flow](https://code-salad.github.io/abstract-flow/).

For the first `0.1.0` publish, merge Release Please's initial release pull
request so it creates the `v0.1.0` tag, then sign in locally with the `vikyw`
npm account and run `npm publish --access public` from that tag. Configure npm
trusted publishing for GitHub owner `code-salad`, repository `abstract-flow`,
and workflow file `release-please.yml`; later releases require no npm token in
this repository.
