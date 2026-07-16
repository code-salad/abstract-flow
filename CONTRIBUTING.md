# Contributing

## Setup

Prerequisites: Bun, just. Then `just setup`.

| Task | Command |
|---|---|
| Run API (:3000) | `just dev-server` |
| Run web (:3002) | `just dev-web` |
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
