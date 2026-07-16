# web/ — agent notes

- This is **Next.js 16** — not the version in your training data. Read
  `node_modules/next/dist/docs/` before writing App Router code.
  Notably: `params`/`searchParams` are **Promises** in pages.
- `/api/*` is a proxy-only prefix rewritten to the backend's `/v1/*`
  (see `next.config.ts`). Browser fetches stay same-origin; no CORS anywhere.
- Wire shapes live in `lib/types.ts` as zod schemas (types inferred). API
  responses are parsed at the boundary in `lib/api.ts` — never cast.
- `lib/layout.ts` is the pure spine-and-side-exit layout; it has tests.
  Pixel measurement stays in `components/flow-canvas.tsx`.
