#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { renderSvg, type SvgPanel } from "../server/src/core/svg";
import {
  analyzeRepo,
  buildFlowTree,
  findRefs,
  type FlowTree,
  type RefHit,
  searchIndex,
  type SearchKind,
} from "../server/src/shell/cli";

const DEFAULT_WEB_PORT = 41_730;
const DEFAULT_API_PORT = 41_731;

const usage = `Usage: abstract-flow [command] [options]

Commands:
  entrypoints              List detected routes and exported functions
  flow <function-id>       Show a compact control-flow graph
  refs <function-id>       List direct callers, callees, and unresolved calls
  search                   Search AST-derived functions, calls, branches, exits
  svg <function-id>        Write a standalone SVG flow chart

Run without a command to start the local UI and API.

Analysis options:
      --repo <path>       Repository to inspect (default: .)
      --depth <n>         Expand resolved calls to this depth (default: 0)
      --direction <kind>  refs: callers, callees, or both (default: both)
      --kind <kind>       search: function, route, call, exit, or branch
      --outcome <kind>    search exits: success, error, or throw
      --query <text>      Case-insensitive AST-aware search text
      --unresolved        search only unresolved calls
      --limit <n>         Maximum search results (default: 50)
  -o, --output <path>     SVG output path; stdout when omitted
      --json              Emit machine-readable JSON
  -h, --help              Show this help

Server options:

Start Abstract Flow for the directory where this command is run.

Options:
  -p, --port <port>      Web UI port (default: ${DEFAULT_WEB_PORT})
      --api-port <port>   API port (default: ${DEFAULT_API_PORT})

Examples:
  abstract-flow entrypoints --repo .
  abstract-flow flow 'src/routes.ts#list:12' --repo . --depth 1
  abstract-flow refs 'src/routes.ts#list:12' --direction callers --repo .
  abstract-flow search --kind exit --outcome throw --repo . --limit 20
  abstract-flow svg 'src/routes.ts#list:12' --repo . -o docs/flow.svg`;

const COMMANDS = new Set([
  "entrypoints",
  "flow",
  "refs",
  "search",
  "svg",
]);

type CommandValues = {
  repo?: string;
  depth?: string;
  direction?: string;
  kind?: string;
  outcome?: string;
  query?: string;
  unresolved?: boolean;
  limit?: string;
  output?: string;
  json?: boolean;
  help?: boolean;
};

function parseCommandArgs(args: string[]) {
  const result = parseArgs({
    args,
    allowPositionals: true,
    options: {
      repo: { type: "string" },
      depth: { type: "string" },
      direction: { type: "string" },
      kind: { type: "string" },
      outcome: { type: "string" },
      query: { type: "string" },
      unresolved: { type: "boolean" },
      limit: { type: "string" },
      output: { type: "string", short: "o" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  return {
    values: result.values as CommandValues,
    positionals: result.positionals,
  };
}

function parseInteger({
  value,
  fallback,
  name,
  max,
}: {
  value: string | undefined;
  fallback: number;
  name: string;
  max?: number;
}): number {
  const parsed = Number(value ?? fallback);
  if (
    !Number.isInteger(parsed) ||
    parsed < 0 ||
    (max !== undefined && parsed > max)
  ) {
    throw new Error(
      `${name} must be an integer from 0${max === undefined ? "" : ` to ${max}`}.`,
    );
  }
  return parsed;
}

function requireFunctionId(positionals: string[]): string {
  const fnId = positionals[0];
  if (fnId === undefined || positionals.length > 1) {
    throw new Error("expected exactly one function ID, such as file.ts#name:12");
  }
  return fnId;
}

function repoPath(values: CommandValues): string {
  return resolve(process.cwd(), values.repo ?? ".");
}

function anchorText({ file, startLine, endLine }: RefHit["via"]["anchor"]): string {
  return `${file}:${startLine}${endLine === startLine ? "" : `-${endLine}`}`;
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function flowText(tree: FlowTree, prefix = ""): string[] {
  const lines = [
    `${prefix}flow ${tree.graph.fnId}`,
    ...tree.graph.nodes.map((node) => {
      const label = compact(node.label);
      return `${prefix}${node.id} ${node.kind} "${label}" @ ${node.anchor.file}:${node.anchor.startLine}`;
    }),
    ...tree.graph.edges.map(
      (edge) =>
        `${prefix}${edge.from} -> ${edge.to}${edge.label === undefined ? "" : ` [${edge.label}]`}${edge.back === true ? " [back]" : ""}`,
    ),
  ];
  for (const child of tree.children) {
    lines.push(`${prefix}expand ${child.callNodeId} -> ${child.targetId}`);
    lines.push(...flowText(child.tree, `${prefix}  `));
  }
  return lines;
}

function refText(hit: RefHit): string {
  return `${hit.functionId} via ${hit.via.name}() @ ${anchorText(hit.via.anchor)}`;
}

function refsText({
  result,
  direction,
}: {
  result: ReturnType<typeof findRefs>;
  direction: "callers" | "callees" | "both";
}): string {
  const lines = [`refs ${result.target}`];
  if (direction === "callers" || direction === "both") {
    lines.push(`callers (${result.callers.length})`);
    lines.push(...result.callers.map((hit) => `  ${refText(hit)}`));
  }
  if (direction === "callees" || direction === "both") {
    lines.push(`callees (${result.callees.length})`);
    lines.push(...result.callees.map((hit) => `  ${refText(hit)}`));
    lines.push(`unresolved (${result.unresolved.length})`);
    lines.push(...result.unresolved.map((hit) => `  ${refText(hit)}`));
  }
  return lines.join("\n");
}

function searchText(hits: ReturnType<typeof searchIndex>): string {
  return hits
    .map((hit) => {
      const details =
        hit.kind === "call"
          ? ` -> ${String(hit.target ?? (hit.candidates ?? "unresolved"))}`
          : hit.kind === "route"
            ? ` -> ${String(hit.functionId)}`
            : hit.kind === "exit"
              ? ` (${String(hit.outcome)})`
              : "";
      return `${hit.kind} ${hit.name}${details} @ ${hit.file}:${hit.line}`;
    })
    .join("\n");
}

function svgPanels(tree: FlowTree, title = tree.graph.name): SvgPanel[] {
  const panels: SvgPanel[] = [{ graph: tree.graph, title }];
  for (const child of tree.children) {
    panels.push(
      ...svgPanels(child.tree, `↳ ${child.targetId} via ${child.callNodeId}`),
    );
  }
  return panels;
}

async function runCommand(command: string, args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args);
  if (values.help) {
    console.log(usage);
    return;
  }

  const analysis = analyzeRepo({ repoPath: repoPath(values) });
  if (command === "entrypoints") {
    if (positionals.length > 0) {
      throw new Error("entrypoints does not accept positional arguments");
    }
    const value = analysis.entrypoints;
    if (values.json) {
      console.log(JSON.stringify(value));
      return;
    }
    const lines = [
      `routes (${value.routes.length})`,
      ...value.routes.map(
        (route) =>
          `  ${route.method} ${route.path} -> ${route.functionId} @ ${route.anchor.file}:${route.anchor.startLine}`,
      ),
      `exports (${value.exports.length})`,
      ...value.exports.map(
        (entry) =>
          `  ${entry.functionId} (inbound ${entry.inboundCalls})`,
      ),
    ];
    console.log(lines.join("\n"));
    return;
  }

  if (command === "flow") {
    const tree = buildFlowTree({
      index: analysis.index,
      fnId: requireFunctionId(positionals),
      depth: parseInteger({
        value: values.depth,
        fallback: 0,
        name: "--depth",
        max: 6,
      }),
    });
    console.log(values.json ? JSON.stringify(tree) : flowText(tree).join("\n"));
    return;
  }

  if (command === "refs") {
    const direction = values.direction ?? "both";
    if (direction !== "callers" && direction !== "callees" && direction !== "both") {
      throw new Error("--direction must be callers, callees, or both");
    }
    const result = findRefs({
      index: analysis.index,
      fnId: requireFunctionId(positionals),
    });
    if (values.json) {
      console.log(JSON.stringify(result));
      return;
    }
    console.log(refsText({ result, direction }));
    return;
  }

  if (command === "search") {
    if (positionals.length > 0) {
      throw new Error("search uses --query instead of positional text");
    }
    const kind = values.kind as SearchKind | undefined;
    if (
      kind !== undefined &&
      !["function", "route", "call", "exit", "branch"].includes(kind)
    ) {
      throw new Error("--kind must be function, route, call, exit, or branch");
    }
    const outcome = values.outcome as
      | "success"
      | "error"
      | "throw"
      | undefined;
    if (
      outcome !== undefined &&
      !["success", "error", "throw"].includes(outcome)
    ) {
      throw new Error("--outcome must be success, error, or throw");
    }
    const hits = searchIndex({
      analysis,
      kind,
      query: values.query,
      outcome,
      unresolved: values.unresolved,
      limit: parseInteger({
        value: values.limit,
        fallback: 50,
        name: "--limit",
        max: 10_000,
      }),
    });
    console.log(values.json ? JSON.stringify(hits) : searchText(hits));
    return;
  }

  if (command === "svg") {
    const tree = buildFlowTree({
      index: analysis.index,
      fnId: requireFunctionId(positionals),
      depth: parseInteger({
        value: values.depth,
        fallback: 0,
        name: "--depth",
        max: 3,
      }),
    });
    const svg = renderSvg({ panels: svgPanels(tree) });
    if (values.output !== undefined) {
      const output = resolve(process.cwd(), values.output);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, svg);
      console.log(
        values.json
          ? JSON.stringify({ output, bytes: Buffer.byteLength(svg) })
          : `wrote ${output}`,
      );
      return;
    }
    process.stdout.write(svg);
  }
}

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

async function startServer(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
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
    fallback: DEFAULT_API_PORT,
    option: "--api-port",
  });
  const webPort = parsePort({
    value: values.port,
    fallback: DEFAULT_WEB_PORT,
    option: "--port",
  });
  const appRoot = resolve(import.meta.dir, "..");
  const serverEntry = resolve(appRoot, "server/src/index.ts");
  const webRoot = resolve(appRoot, "web");
  const webBuild = resolve(webRoot, ".next-prod");
  const require = createRequire(import.meta.url);
  const nextEntry = require.resolve("next/dist/bin/next");

  if (!existsSync(serverEntry) || !existsSync(webRoot) || !existsSync(webBuild)) {
    throw new Error(
      "Abstract Flow's production server and web assets are missing from this package.",
    );
  }

  const api = Bun.spawn(["bun", serverEntry], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(apiPort) },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const web = Bun.spawn(
    [process.execPath, nextEntry, "start", "-p", String(webPort)],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        API_ORIGIN: `http://localhost:${apiPort}`,
        NEXT_DIST_DIR: ".next-prod",
      },
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

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command !== undefined && COMMANDS.has(command)) {
    await runCommand(command, args);
    return;
  }
  await startServer(process.argv.slice(2));
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
