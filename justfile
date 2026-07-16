default:
    @just --list

setup:
    bun install
    cd server && bun install
    cd web && bun install
    cd site && bun install

dev-server:
    bun run --watch server/src/index.ts

dev-web:
    cd web && bun run dev

dev-site:
    cd site && bun run dev

check:
    cd server && bunx biome check --write src
    cd web && bunx biome check --write app lib
    cd site && bun run lint

typecheck:
    cd server && bunx tsc --noEmit
    cd web && bunx tsc --noEmit
    cd site && bun run check

test:
    cd server && bun test
    cd web && bun test

ci:
    cd server && bunx biome check src && bunx tsc --noEmit && bun test
    cd web && bunx biome check app lib && bunx tsc --noEmit && bun test
    cd site && bun run lint && bun run check && bun run build
    npm pack --dry-run
