default:
    @just --list

setup:
    cd server && bun install
    cd web && bun install

dev-server:
    cd server && bun run --watch src/index.ts

dev-web:
    cd web && bun run dev

check:
    cd server && bunx biome check --write src
    cd web && bunx biome check --write app lib

typecheck:
    cd server && bunx tsc --noEmit
    cd web && bunx tsc --noEmit

test:
    cd server && bun test
    cd web && bun test

ci:
    cd server && bunx biome check src && bunx tsc --noEmit && bun test
    cd web && bunx biome check app lib && bunx tsc --noEmit && bun test
