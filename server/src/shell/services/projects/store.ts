import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
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

export function openProject({ repoPath }: { repoPath: string }): Project {
  if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
    throw new Error(`not a directory: ${repoPath}`);
  }
  const index = indexProject({ repoPath });
  const id = createHash("sha1").update(index.root).digest("hex").slice(0, 8);
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
