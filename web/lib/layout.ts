import type { FlowGraph } from "./types";

// Custom layered layout for the spine-and-side-exit convention (PRD §8.6):
// happy path top-to-bottom in column 0, error/throw exits pushed sideways.
// Pure and deterministic: same graph → same layers/columns. Generic
// force/graphviz layouts are deliberately not used.

export type GraphLayout = {
  layers: string[][]; // node ids per layer, top to bottom
  col: Map<string, number>;
  maxCol: number;
};

export function layoutGraph({ graph }: { graph: FlowGraph }): GraphLayout {
  const forward = graph.edges.filter((e) => e.back !== true);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  // Longest-path layering. Node emission order is topological for forward
  // edges (the CFG builder emits sources before targets), so one pass works.
  const layer = new Map<string, number>();
  for (const n of graph.nodes) {
    if (!layer.has(n.id)) {
      layer.set(n.id, 0);
    }
    for (const e of forward.filter((e) => e.from === n.id)) {
      const proposed = (layer.get(n.id) ?? 0) + 1;
      if (proposed > (layer.get(e.to) ?? 0)) {
        layer.set(e.to, proposed);
      }
    }
  }

  // Column assignment: at each fan-out, edges to error/throw exits are "side"
  // (offset after the spine edges); the first non-error edge keeps the column.
  const col = new Map<string, number>();
  const isErrorExit = (id: string): boolean => {
    const n = byId.get(id);
    return n?.kind === "exit" && n.outcome !== "success";
  };
  for (const n of graph.nodes) {
    const from = col.get(n.id) ?? 0;
    if (!col.has(n.id)) {
      col.set(n.id, from);
    }
    const outs = forward.filter((e) => e.from === n.id);
    // Loop continuation ("done") stays on the spine; the body indents.
    const ordered =
      n.kind === "loop"
        ? [
            ...outs.filter((e) => e.label === "done"),
            ...outs.filter((e) => e.label !== "done"),
          ]
        : outs;
    const spine = ordered.filter((e) => !isErrorExit(e.to));
    const side = ordered.filter((e) => isErrorExit(e.to));
    [...spine, ...side].forEach((e, idx) => {
      const proposed = from + idx;
      const existing = col.get(e.to);
      if (existing === undefined || proposed < existing) {
        col.set(e.to, proposed);
      }
    });
  }

  // Group by layer; resolve col collisions within a layer by bumping right.
  // ponytail: greedy collision fix; proper horizontal compaction if graphs
  // ever get wide enough to care.
  const layerCount = Math.max(...[...layer.values()], 0) + 1;
  const layers: string[][] = Array.from({ length: layerCount }, () => []);
  for (const n of graph.nodes) {
    layers[layer.get(n.id) ?? 0]?.push(n.id);
  }
  let maxCol = 0;
  for (const ids of layers) {
    const used = new Set<number>();
    ids.sort((a, b) => (col.get(a) ?? 0) - (col.get(b) ?? 0));
    for (const id of ids) {
      let c = col.get(id) ?? 0;
      while (used.has(c)) {
        c += 1;
      }
      used.add(c);
      col.set(id, c);
      maxCol = Math.max(maxCol, c);
    }
  }

  return { layers, col, maxCol };
}
