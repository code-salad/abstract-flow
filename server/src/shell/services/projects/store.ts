import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { buildCfg } from "../../../core/cfg";
import { detectEntrypoints } from "../../../core/entrypoints";
import type { Entrypoints, FlowGraph } from "../../../core/types";
import { indexProject, type ProjectIndex } from "../../providers/ts-compiler";

// ponytail: in-memory single-process store; swap for the SQLite index (PRD §8.4)
// when persistence across restarts matters.

type Project = {
  id: string;
  index: ProjectIndex;
  entrypoints: Entrypoints;
  flows: Map<string, FlowGraph>; // lazy per-function CFG cache (F2)
};

const projects = new Map<string, Project>();

export function openProject({
  repoPath,
  force = false,
}: {
  repoPath: string;
  force?: boolean;
}): Project {
  const root = resolve(repoPath);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`not a directory: ${repoPath}`);
  }
  const id = createHash("sha1").update(root).digest("hex").slice(0, 8);
  const cached = projects.get(id);
  if (!force && cached?.index.root === root) {
    return cached;
  }

  const index = indexProject({ repoPath: root });
  const entrypoints = detectEntrypoints({
    functions: [...index.functions.values()],
    callSites: index.callSites,
    inbound: index.inbound,
  });
  const project: Project = { id, index, entrypoints, flows: new Map() };
  projects.set(id, project);
  return project;
}

export function getProject({ id }: { id: string }): Project | undefined {
  return projects.get(id);
}

export function getFlow({
  project,
  fnId,
}: {
  project: Project;
  fnId: string;
}): FlowGraph | undefined {
  const cached = project.flows.get(fnId);
  if (cached !== undefined) {
    return cached;
  }
  const fn = project.index.functions.get(fnId);
  if (fn === undefined) {
    return undefined;
  }
  const graph = buildCfg({ fn });
  project.flows.set(fnId, graph);
  return graph;
}
