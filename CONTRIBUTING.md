# Contributing

## Setup

Prerequisites: Bun, just. Then `just setup`.

| Task | Command |
|---|---|
| Run API (:3000) | `just dev-server` |
| Run web (:3002) | `just dev-web` |
| Run public site (:3003) | `just dev-site` |
| Format + lint | `just check` |
| Typecheck | `just typecheck` |
| Tests | `just test` |
| All CI gates | `just ci` |

## Layout

- `server/src/core/` — **pure** logic (CFG, labels, entry points). No I/O, no
  compiler imports. Every `<name>.ts` has a sibling `<name>.test.ts`. This is
  where the zero-hallucination guarantee lives; correctness bugs here are P0.
- `server/src/shell/` — all side effects: `providers/` (TypeScript compiler
  adapter — the only place that touches `ts.*`), `http/` (one Elysia group per
  resource), `services/`, `lib/`.
- `web/lib/` — zod wire schemas + API client + pure layout engine (tested).
- `web/app/`, `web/components/` — Next.js 16 App Router UI.
- `site/` — separate static Next.js site for GitHub Pages. It must stay free of
  runtime API rewrites and server-only code.
- `bin/` — the published CLI. Keep it a thin launcher; reusable server behavior
  belongs in `server/`.

## Branches and releases

- Target normal pull requests at `alpha`.
- Use conventional commits (`feat:`, `fix:`, `docs:`, and so on), so Release
  Please can calculate the next version and changelog.
- To release, open and merge an `alpha` → `beta` pull request. Release Please
  then creates its release pull request on `beta`; merging that publishes the
  root `abstract-flow` package through npm trusted publishing. GitHub Pages
  also deploys from `beta`.
- Bootstrap `0.1.0` with a manual publish from the `vikyw` account, then set
  the npm trusted-publisher record for this repository and workflow. Do not add
  an npm token; later releases use GitHub Actions OIDC.

## Code style

- Biome is the only formatter/linter (`just check`). Two GritQL plugins gate
  every commit and CI run:
  - **No type assertions** — no `as` except `as const`; parse external data
    through a zod/TypeBox schema.
  - **No positional arguments** — named functions take a single object param:
    `fn({ a, b })`, not `fn(a, b)`.
- Strict TS, no `any`. New env vars go in the zod schema in
  `server/src/shell/lib/env.ts` **and** `server/.env.example`.
- Run `just ci` before pushing.
