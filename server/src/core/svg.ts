import type { FlowEdge, FlowGraph, FlowNode } from "./types";

const NODE_W = 264;
const NODE_H = 56;
const COL_W = 336;
const ROW_H = 104;
const PAD = 32;
const HEADER_H = 32;

type Layout = {
  layers: string[][];
  col: Map<string, number>;
  maxCol: number;
};

type Position = { x: number; y: number };

export type SvgPanel = { graph: FlowGraph; title?: string };

const escapeXml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char] ?? char,
  );

const shorten = (value: string, max = 48): string => {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
};

function layoutGraph({ graph }: { graph: FlowGraph }): Layout {
  const forward = graph.edges.filter((edge) => edge.back !== true);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoingByNode = new Map<string, typeof forward>();
  for (const edge of forward) {
    const outgoing = outgoingByNode.get(edge.from);
    if (outgoing === undefined) {
      outgoingByNode.set(edge.from, [edge]);
    } else {
      outgoing.push(edge);
    }
  }
  const layer = new Map<string, number>();

  for (const node of graph.nodes) {
    if (!layer.has(node.id)) {
      layer.set(node.id, 0);
    }
    for (const edge of outgoingByNode.get(node.id) ?? []) {
      const next = (layer.get(node.id) ?? 0) + 1;
      if (next > (layer.get(edge.to) ?? 0)) {
        layer.set(edge.to, next);
      }
    }
  }

  const col = new Map<string, number>();
  const isSideExit = (id: string): boolean => {
    const node = byId.get(id);
    return node?.kind === "exit" && node.outcome !== "success";
  };

  for (const node of graph.nodes) {
    const from = col.get(node.id) ?? 0;
    col.set(node.id, from);
    const outgoing = outgoingByNode.get(node.id) ?? [];
    const ordered =
      node.kind === "loop"
        ? [
            ...outgoing.filter((edge) => edge.label === "done"),
            ...outgoing.filter((edge) => edge.label !== "done"),
          ]
        : outgoing;
    const spine = ordered.filter((edge) => !isSideExit(edge.to));
    const side = ordered.filter((edge) => isSideExit(edge.to));
    [...spine, ...side].forEach((edge, index) => {
      const proposed = from + index;
      const existing = col.get(edge.to);
      if (existing === undefined || proposed < existing) {
        col.set(edge.to, proposed);
      }
    });
  }

  const layerCount = Math.max(...layer.values(), 0) + 1;
  const layers: string[][] = Array.from({ length: layerCount }, () => []);
  for (const node of graph.nodes) {
    layers[layer.get(node.id) ?? 0]?.push(node.id);
  }

  let maxCol = 0;
  for (const ids of layers) {
    const used = new Set<number>();
    ids.sort((a, b) => (col.get(a) ?? 0) - (col.get(b) ?? 0));
    for (const id of ids) {
      let current = col.get(id) ?? 0;
      while (used.has(current)) {
        current += 1;
      }
      used.add(current);
      col.set(id, current);
      maxCol = Math.max(maxCol, current);
    }
  }

  return { layers, col, maxCol };
}

function nodeColors(node: FlowNode): { fill: string; stroke: string } {
  if (node.kind === "entry") {
    return { fill: "#3f3f46", stroke: "#a1a1aa" };
  }
  if (node.kind === "decision") {
    return { fill: "#451a03", stroke: "#f59e0b" };
  }
  if (node.kind === "call") {
    return { fill: "#2e1065", stroke: "#a78bfa" };
  }
  if (node.kind === "loop") {
    return { fill: "#082f49", stroke: "#38bdf8" };
  }
  if (node.kind === "exit") {
    if (node.outcome === "success") {
      return { fill: "#052e16", stroke: "#34d399" };
    }
    if (node.outcome === "error") {
      return { fill: "#450a0a", stroke: "#f87171" };
    }
    return { fill: "#431407", stroke: "#fb923c" };
  }
  return { fill: "#27272a", stroke: "#71717a" };
}

function edgeMarkup({
  edge,
  from,
  to,
  target,
}: {
  edge: FlowEdge;
  from: Position;
  to: Position;
  target: FlowNode | undefined;
}): string {
  const error = target?.kind === "exit" && target.outcome !== "success";
  const stroke = edge.back === true ? "#38bdf8" : error ? "#f87171" : "#71717a";
  const label = edge.label === undefined ? "" : escapeXml(edge.label);

  if (edge.back === true) {
    const x0 = from.x;
    const y0 = from.y + NODE_H / 2;
    const x1 = to.x;
    const y1 = to.y + NODE_H / 2;
    const bow = Math.min(x0, x1) - 28;
    return `<path d="M ${x0} ${y0} C ${bow} ${y0}, ${bow} ${y1}, ${x1} ${y1}" fill="none" stroke="${stroke}" stroke-width="1.5" marker-end="url(#arrow)"/><text x="${bow}" y="${(y0 + y1) / 2}" fill="#a1a1aa" font-size="11" text-anchor="middle">${label}</text>`;
  }

  const x0 = from.x;
  const y0 = from.y + NODE_H;
  const x1 = to.x;
  const y1 = to.y;
  const middle = (y0 + y1) / 2;
  return `<path d="M ${x0} ${y0} C ${x0} ${middle}, ${x1} ${middle}, ${x1} ${y1}" fill="none" stroke="${stroke}" stroke-width="1.5" marker-end="url(#arrow)"/><text x="${(x0 + x1) / 2 + 6}" y="${middle - 4}" fill="#a1a1aa" font-size="11" text-anchor="middle">${label}</text>`;
}

function panelMarkup({
  panel,
  offsetY,
}: {
  panel: SvgPanel;
  offsetY: number;
}): { markup: string; width: number; height: number } {
  const { graph } = panel;
  const layout = layoutGraph({ graph });
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const positions = new Map<string, Position>();
  for (const [layerIndex, ids] of layout.layers.entries()) {
    for (const id of ids) {
      positions.set(id, {
        x: PAD + (layout.col.get(id) ?? 0) * COL_W + NODE_W / 2,
        y: offsetY + HEADER_H + PAD + layerIndex * ROW_H,
      });
    }
  }

  const title = escapeXml(panel.title ?? graph.name);
  const edges = graph.edges
    .map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (from === undefined || to === undefined) {
        return "";
      }
      return edgeMarkup({ edge, from, to, target: byId.get(edge.to) });
    })
    .join("");

  const nodes = graph.nodes
    .map((node) => {
      const position = positions.get(node.id);
      if (position === undefined) {
        return "";
      }
      const colors = nodeColors(node);
      const x = position.x - NODE_W / 2;
      const y = position.y;
      const radius = node.kind === "entry" ? NODE_H / 2 : 8;
      const source = `${node.anchor.file}:${node.anchor.startLine}`;
      return `<g data-node="${escapeXml(node.id)}" data-source="${escapeXml(source)}"><title>${escapeXml(node.label)} — ${escapeXml(source)}</title><rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${radius}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1.5"/><text x="${position.x}" y="${y + NODE_H / 2 + 4}" fill="#e4e4e7" font-size="13" text-anchor="middle">${escapeXml(shorten(node.label))}</text></g>`;
    })
    .join("");

  const width = PAD * 2 + (layout.maxCol + 1) * COL_W + NODE_W;
  const height =
    HEADER_H + PAD * 2 + Math.max(layout.layers.length, 1) * ROW_H + NODE_H;
  return {
    markup: `<g><text x="${PAD}" y="${offsetY + 22}" fill="#d4d4d8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">${title}</text>${edges}${nodes}</g>`,
    width,
    height,
  };
}

export function renderSvg({ panels }: { panels: SvgPanel[] }): string {
  const selected =
    panels.length > 0
      ? panels
      : [{ graph: { fnId: "", name: "empty", nodes: [], edges: [] } }];
  let offsetY = 0;
  let width = 0;
  const markup: string[] = [];

  for (const panel of selected) {
    const rendered = panelMarkup({ panel, offsetY });
    markup.push(rendered.markup);
    width = Math.max(width, rendered.width);
    offsetY += rendered.height;
  }

  const height = Math.max(offsetY, 1);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Abstract Flow</title><desc id="desc">Deterministic TypeScript control-flow graph</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#a1a1aa"/></marker></defs><rect width="100%" height="100%" fill="#18181b"/>${markup.join("")}</svg>\n`;
}
