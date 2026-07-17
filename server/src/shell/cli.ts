import { buildCfg } from "../core/cfg";
import { detectEntrypoints } from "../core/entrypoints";
import type {
  CallRef,
  Entrypoints,
  FlowGraph,
  NormFunction,
  NormStmt,
  SourceAnchor,
} from "../core/types";
import { indexProject, type ProjectIndex } from "./providers/ts-compiler";

export type Analysis = { index: ProjectIndex; entrypoints: Entrypoints };

export function analyzeRepo({ repoPath }: { repoPath: string }): Analysis {
  const index = indexProject({ repoPath });
  return {
    index,
    entrypoints: detectEntrypoints({
      functions: [...index.functions.values()],
      callSites: index.callSites,
      inbound: index.inbound,
    }),
  };
}

export function getFunction({
  index,
  fnId,
}: {
  index: ProjectIndex;
  fnId: string;
}): NormFunction {
  const fn = index.functions.get(fnId);
  if (fn === undefined) {
    throw new Error(`unknown function: ${fnId}`);
  }
  return fn;
}

function callsInStatements(stmts: NormStmt[]): CallRef[] {
  return stmts.flatMap((stmt) => {
    if (
      stmt.kind === "plain" ||
      stmt.kind === "return" ||
      stmt.kind === "throw"
    ) {
      return stmt.calls;
    }
    if (stmt.kind === "if") {
      return [
        ...callsInStatements(stmt.thenBranch),
        ...callsInStatements(stmt.else ?? []),
      ];
    }
    if (stmt.kind === "loop") {
      return callsInStatements(stmt.body);
    }
    return [
      ...callsInStatements(stmt.body),
      ...callsInStatements(stmt.handler),
    ];
  });
}

export type RefHit = {
  functionId: string;
  name: string;
  via: CallRef;
};

export type RefResult = {
  target: string;
  callers: RefHit[];
  callees: RefHit[];
  unresolved: RefHit[];
};

export function findRefs({
  index,
  fnId,
}: {
  index: ProjectIndex;
  fnId: string;
}): RefResult {
  const fn = getFunction({ index, fnId });
  const callees: RefHit[] = [];
  const unresolved: RefHit[] = [];
  for (const call of callsInStatements(fn.body)) {
    const targets =
      call.candidates?.length !== undefined && call.candidates.length > 0
        ? call.candidates
        : call.targetId === undefined
          ? []
          : [call.targetId];
    for (const target of targets) {
      const targetFn = index.functions.get(target);
      if (targetFn !== undefined) {
        callees.push({ functionId: target, name: targetFn.name, via: call });
      }
    }
    if (targets.length === 0) {
      unresolved.push({ functionId: fn.id, name: fn.name, via: call });
    }
  }

  const callers: RefHit[] = [];
  for (const candidate of index.functions.values()) {
    for (const call of callsInStatements(candidate.body)) {
      if (
        call.targetId === fnId ||
        (call.candidates?.includes(fnId) ?? false)
      ) {
        callers.push({
          functionId: candidate.id,
          name: candidate.name,
          via: call,
        });
      }
    }
  }

  return { target: fnId, callers, callees, unresolved };
}

export type FlowTree = {
  graph: FlowGraph;
  children: Array<{ callNodeId: string; targetId: string; tree: FlowTree }>;
};

export function buildFlowTree({
  index,
  fnId,
  depth,
  seen = new Set([fnId]),
}: {
  index: ProjectIndex;
  fnId: string;
  depth: number;
  seen?: Set<string>;
}): FlowTree {
  const graph = buildCfg({ fn: getFunction({ index, fnId }) });
  if (depth === 0) {
    return { graph, children: [] };
  }

  const children: FlowTree["children"] = [];
  for (const node of graph.nodes) {
    if (node.kind !== "call") {
      continue;
    }
    const targets =
      node.call.candidates?.length !== undefined &&
      node.call.candidates.length > 0
        ? node.call.candidates
        : node.call.targetId === undefined
          ? []
          : [node.call.targetId];
    for (const targetId of targets) {
      if (seen.has(targetId) || !index.functions.has(targetId)) {
        continue;
      }
      const nextSeen = new Set(seen);
      nextSeen.add(targetId);
      children.push({
        callNodeId: node.id,
        targetId,
        tree: buildFlowTree({
          index,
          fnId: targetId,
          depth: depth - 1,
          seen: nextSeen,
        }),
      });
    }
  }
  return { graph, children };
}

export type SearchKind = "function" | "route" | "call" | "exit" | "branch";

export type SearchHit = {
  kind: SearchKind;
  id: string;
  name: string;
  file: string;
  line: number;
  [key: string]: unknown;
};

function anchorFields(anchor: SourceAnchor): { file: string; line: number } {
  return { file: anchor.file, line: anchor.startLine };
}

export function searchIndex({
  analysis,
  kind,
  query,
  outcome,
  unresolved,
  limit,
}: {
  analysis: Analysis;
  kind?: SearchKind;
  query?: string;
  outcome?: "success" | "error" | "throw";
  unresolved?: boolean;
  limit: number;
}): SearchHit[] {
  const hits: SearchHit[] = [];
  const needle = query?.toLowerCase();
  const add = (hit: SearchHit) => {
    if (kind !== undefined && hit.kind !== kind) {
      return;
    }
    if (outcome !== undefined && hit.outcome !== outcome) {
      return;
    }
    if (unresolved === true && hit.unresolved !== true) {
      return;
    }
    if (
      needle !== undefined &&
      !JSON.stringify(hit).toLowerCase().includes(needle)
    ) {
      return;
    }
    if (hits.length < limit) {
      hits.push(hit);
    }
  };

  const { index, entrypoints } = analysis;
  for (const fn of index.functions.values()) {
    add({
      kind: "function",
      id: fn.id,
      name: fn.name,
      ...anchorFields(fn.anchor),
      exported: fn.exported,
      inboundCalls: index.inbound.get(fn.id) ?? 0,
    });

    callsInStatements(fn.body).forEach((call, callIndex) => {
      add({
        kind: "call",
        id: `${fn.id}:call:${callIndex}`,
        name: call.name,
        ...anchorFields(call.anchor),
        caller: fn.id,
        target: call.targetId,
        candidates: call.candidates,
        external: call.external,
        dynamic: (call.candidates?.length ?? 0) > 0,
        unresolved:
          call.targetId === undefined && (call.candidates?.length ?? 0) === 0,
      });
    });

    const graph = buildCfg({ fn });
    for (const node of graph.nodes) {
      if (node.kind === "exit") {
        add({
          kind: "exit",
          id: `${fn.id}:${node.id}`,
          name: node.label,
          ...anchorFields(node.anchor),
          functionId: fn.id,
          outcome: node.outcome,
        });
      } else if (node.kind === "decision" || node.kind === "loop") {
        add({
          kind: "branch",
          id: `${fn.id}:${node.id}`,
          name: node.label,
          ...anchorFields(node.anchor),
          functionId: fn.id,
          branchKind: node.kind,
        });
      }
    }
  }

  for (const route of entrypoints.routes) {
    add({
      kind: "route",
      id: route.functionId,
      name: `${route.method} ${route.path}`,
      ...anchorFields(route.anchor),
      method: route.method,
      path: route.path,
      functionId: route.functionId,
    });
  }

  return hits;
}
