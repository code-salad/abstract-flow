# Codeflow

Deterministic code flow visualization — navigable, branch-level control flow
graphs derived from the TypeScript AST. No LLM anywhere in the pipeline: if the
tool shows an edge, that edge exists in the source. See [docs/prd](docs/prd/README.md).

## Run it

Codeflow is one Bun package with two entry points: a CLI that runs the local UI
and API together, and a server export for embedding in another Bun service.

```sh
bunx @vikyw/abstract-flow
# UI: http://localhost:3002
# API: http://localhost:3000
```

To embed only the server:

```ts
import { app } from "@vikyw/abstract-flow";

app.listen(3000);
```

The package requires [Bun](https://bun.sh). The npm command becomes available
once the first Release Please release has been published.

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
- [Release Please](https://github.com/googleapis/release-please) opens the version/changelog pull request on `beta`; after the npm trusted-publishing bootstrap, merging it publishes `@vikyw/abstract-flow`.
- The Pages workflow builds `site/` from `alpha`. In GitHub, enable **Settings → Pages → GitHub Actions**. Private repositories need a GitHub plan that supports Pages.

For the first `0.1.0` publish, sign in locally with the `vikyw` npm account and
run `npm publish --access public` from the release commit. Then configure npm
trusted publishing for GitHub owner `code-salad`, repository `abstract-flow`,
and workflow file `release-please.yml`; later releases require no npm token in
this repository.
