#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const usage = `Usage: abstract-flow [options]

Start Abstract Flow for the directory where this command is run.

Options:
  -p, --port <port>      Web UI port (default: 3002)
      --api-port <port>  API port (default: 3000)
  -h, --help             Show this help`;

function parsePort({
  value,
  fallback,
  option,
}: {
  value: string | undefined;
  fallback: number;
  option: string;
}) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`${option} must be an integer from 1 to 65535.`);
  }

  return parsed;
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      port: { type: "string", short: "p" },
      "api-port": { type: "string" },
    },
  });

  if (values.help) {
    console.log(usage);
    return;
  }

  const apiPort = parsePort({
    value: values["api-port"],
    fallback: 3000,
    option: "--api-port",
  });
  const webPort = parsePort({
    value: values.port,
    fallback: 3002,
    option: "--port",
  });
  const appRoot = resolve(import.meta.dir, "..");
  const serverEntry = resolve(appRoot, "server/src/index.ts");
  const webRoot = resolve(appRoot, "web");
  const require = createRequire(import.meta.url);
  const nextEntry = require.resolve("next/dist/bin/next");

  if (!existsSync(serverEntry) || !existsSync(webRoot)) {
    throw new Error("Abstract Flow's server and web assets are missing from this package.");
  }

  const api = Bun.spawn(["bun", serverEntry], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(apiPort) },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const web = Bun.spawn(
    [process.execPath, nextEntry, "dev", "--webpack", "-p", String(webPort)],
    {
      cwd: webRoot,
      env: { ...process.env, API_ORIGIN: `http://localhost:${apiPort}` },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  const children = [api, web];
  let stopping = false;

  const stop = ({ signal }: { signal: "SIGINT" | "SIGTERM" }) => {
    if (stopping) return;
    stopping = true;

    for (const child of children) {
      if (child.exitCode === null) child.kill(signal);
    }
  };

  process.once("SIGINT", () => stop({ signal: "SIGINT" }));
  process.once("SIGTERM", () => stop({ signal: "SIGTERM" }));

  console.log(`Abstract Flow: http://localhost:${webPort}`);
  const exitCode = await Promise.race(children.map((child) => child.exited));
  stop({ signal: "SIGTERM" });
  await Promise.all(children.map((child) => child.exited));
  process.exitCode = exitCode;
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
