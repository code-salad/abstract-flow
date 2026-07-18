"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFlow } from "../lib/api";
import { layoutGraph } from "../lib/layout";
import type { CallRef, FlowGraph, FlowNode, SourceAnchor } from "../lib/types";

const COL_W = 300;
const NODE_W = 264;

type Expansion = { fnId: string; graph: FlowGraph };

export type FlowCanvasProps = {
  projectId: string;
  graph: FlowGraph;
  ancestors: string[]; // fn ids up the render path — recursion guard (F12)
  onFocus: ({ fnId }: { fnId: string }) => void;
  onPeek: ({ anchor }: { anchor: SourceAnchor }) => void;
};

type EdgePath = {
  d: string;
  label?: string;
  back?: boolean;
  error?: boolean;
  x: number;
  y: number;
};

export function FlowCanvas({
  projectId,
  graph,
  ancestors,
  onFocus,
  onPeek,
}: FlowCanvasProps) {
  const { layers, col, maxCol } = useMemo(
    () => layoutGraph({ graph }),
    [graph],
  );
  const byId = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph],
  );
  const [expanded, setExpanded] = useState<
    Record<string, Expansion | undefined>
  >({});
  const [pickerFor, setPickerFor] = useState<string | undefined>();
  const [paths, setPaths] = useState<EdgePath[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const cRect = container.getBoundingClientRect();
    const rects = new Map<
      string,
      { top: number; bottom: number; left: number; right: number; cx: number }
    >();
    for (const el of container.querySelectorAll<HTMLElement>("[data-node]")) {
      if (el.closest("[data-flow-canvas]") !== container) {
        continue;
      }
      const id = el.dataset.node;
      if (id === undefined) {
        continue;
      }
      const r = el.getBoundingClientRect();
      rects.set(id, {
        top: r.top - cRect.top,
        bottom: r.bottom - cRect.top,
        left: r.left - cRect.left,
        right: r.right - cRect.left,
        cx: r.left - cRect.left + r.width / 2,
      });
    }
    const next: EdgePath[] = [];
    for (const e of graph.edges) {
      const a = rects.get(e.from);
      const b = rects.get(e.to);
      if (a === undefined || b === undefined) {
        continue;
      }
      const target = byId.get(e.to);
      const error = target?.kind === "exit" && target.outcome !== "success";
      if (e.back === true) {
        // Loop back edge: bow out on the left (F7).
        const x0 = a.left;
        const y0 = a.top + 10;
        const x1 = b.left;
        const y1 = b.bottom - 10;
        const bow = Math.min(x0, x1) - 28;
        next.push({
          d: `M ${x0} ${y0} C ${bow} ${y0}, ${bow} ${y1}, ${x1} ${y1}`,
          back: true,
          x: bow,
          y: (y0 + y1) / 2,
          ...(e.label === undefined ? {} : { label: e.label }),
        });
        continue;
      }
      const x0 = a.cx;
      const y0 = a.bottom;
      const x1 = b.cx;
      const y1 = b.top;
      const my = (y0 + y1) / 2;
      next.push({
        d: `M ${x0} ${y0} C ${x0} ${my}, ${x1} ${my}, ${x1} ${y1}`,
        error,
        x: (x0 + x1) / 2 + 6,
        y: my,
        ...(e.label === undefined ? {} : { label: e.label }),
      });
    }
    setPaths(next);
  }, [graph, byId]);

  useEffect(() => {
    measure();
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    let frame: number | undefined;
    const schedule = () => {
      if (frame !== undefined) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = undefined;
        measure();
      });
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    for (const el of container.querySelectorAll<HTMLElement>("[data-node]")) {
      if (el.closest("[data-flow-canvas]") === container) {
        ro.observe(el);
      }
    }
    return () => {
      ro.disconnect();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [measure]);

  const toggleExpand = async ({
    node,
    fnId,
  }: {
    node: FlowNode;
    fnId: string;
  }) => {
    setPickerFor(undefined);
    if (expanded[node.id] !== undefined) {
      setExpanded((prev) => ({ ...prev, [node.id]: undefined }));
      return;
    }
    const child = await fetchFlow({ projectId, fnId });
    setExpanded((prev) => ({ ...prev, [node.id]: { fnId, graph: child } }));
  };

  const width = (maxCol + 1) * COL_W;

  return (
    <div
      ref={containerRef}
      data-flow-canvas
      className="relative"
      style={{ minWidth: width }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
        role="presentation"
      >
        {paths.map((p) => (
          <g key={p.d}>
            <path
              d={p.d}
              fill="none"
              strokeWidth={1.5}
              className={
                p.back === true
                  ? "stroke-sky-500"
                  : p.error === true
                    ? "stroke-red-400/70"
                    : "stroke-zinc-500"
              }
            />
            {p.label !== undefined && (
              <text x={p.x} y={p.y} className="fill-zinc-400 text-[10px]">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="relative flex flex-col gap-9">
        {layers.map((ids, i) => {
          let cursor = 0;
          return (
            <div
              key={`layer-${ids[0] ?? i}`}
              className="flex min-h-[52px] items-start"
            >
              {ids.map((id) => {
                const node = byId.get(id);
                if (node === undefined) {
                  return null;
                }
                const c = col.get(id) ?? 0;
                const marginLeft = (c - cursor) * COL_W;
                cursor = c + 1;
                return (
                  <div
                    key={id}
                    className="shrink-0"
                    style={{ marginLeft, width: NODE_W }}
                  >
                    <NodeBox
                      node={node}
                      projectId={projectId}
                      graph={graph}
                      ancestors={ancestors}
                      expanded={expanded[id]}
                      pickerOpen={pickerFor === id}
                      onPick={() =>
                        setPickerFor(pickerFor === id ? undefined : id)
                      }
                      onToggle={toggleExpand}
                      onFocus={onFocus}
                      onPeek={onPeek}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const KIND_STYLE: Record<string, string> = {
  entry: "rounded-full bg-zinc-700 text-zinc-100",
  block: "rounded-md border border-zinc-600 bg-zinc-800 hover:border-zinc-400",
  decision: "rounded-md border border-amber-500/60 bg-amber-950/40",
  call: "rounded-md border border-violet-500/60 bg-violet-950/40",
  loop: "rounded-md border border-sky-500/60 bg-sky-950/40",
};

const EXIT_STYLE: Record<string, string> = {
  success: "rounded-md border border-emerald-500/60 bg-emerald-950/40",
  error: "rounded-md border border-red-500/60 bg-red-950/40",
  throw: "rounded-md border border-orange-500/60 bg-orange-950/40",
};

type NodeBoxProps = {
  node: FlowNode;
  projectId: string;
  graph: FlowGraph;
  ancestors: string[];
  expanded?: Expansion;
  pickerOpen: boolean;
  onPick: () => void;
  onToggle: ({ node, fnId }: { node: FlowNode; fnId: string }) => void;
  onFocus: ({ fnId }: { fnId: string }) => void;
  onPeek: ({ anchor }: { anchor: SourceAnchor }) => void;
};

function NodeBox({
  node,
  projectId,
  graph,
  ancestors,
  expanded,
  pickerOpen,
  onPick,
  onToggle,
  onFocus,
  onPeek,
}: NodeBoxProps) {
  const style =
    node.kind === "exit"
      ? EXIT_STYLE[node.outcome]
      : (KIND_STYLE[node.kind] ?? KIND_STYLE.block);
  const labelFrom = "labelFrom" in node ? node.labelFrom : undefined;
  const title = `${node.anchor.file}:${node.anchor.startLine}${labelFrom === undefined ? "" : ` — label from: ${labelFrom}`}`;

  if (node.kind === "call") {
    return (
      <CallNode
        node={node}
        call={node.call}
        style={style ?? ""}
        title={title}
        projectId={projectId}
        graph={graph}
        ancestors={ancestors}
        expanded={expanded}
        pickerOpen={pickerOpen}
        onPick={onPick}
        onToggle={onToggle}
        onFocus={onFocus}
        onPeek={onPeek}
      />
    );
  }

  return (
    <button
      type="button"
      data-node={node.id}
      title={title}
      onClick={() => onPeek({ anchor: node.anchor })}
      className={`block w-full px-3 py-2 text-left text-sm ${style} ${node.kind === "loop" ? "" : ""}`}
    >
      {node.kind === "loop" && <span className="mr-1 text-sky-400">↻</span>}
      {node.kind === "decision" && (
        <span className="mr-1 text-amber-400">◇</span>
      )}
      <span>{node.label}</span>
      {node.kind === "block" && node.calls.length > 0 && (
        <span className="mt-1 block truncate text-[10px] text-zinc-500">
          calls: {node.calls.map((c) => c.name).join(", ")}
        </span>
      )}
    </button>
  );
}

type CallNodeProps = NodeBoxProps & {
  call: CallRef;
  style: string;
  title: string;
};

function CallNode({
  node,
  call,
  style,
  title,
  projectId,
  graph,
  ancestors,
  expanded,
  pickerOpen,
  onPick,
  onToggle,
  onFocus,
  onPeek,
}: CallNodeProps) {
  const isRecursive =
    call.targetId !== undefined &&
    (call.targetId === graph.fnId || ancestors.includes(call.targetId));
  const candidates = call.candidates ?? [];
  const hasPicker = candidates.length > 1;

  return (
    <div
      data-node={node.id}
      className={`w-full px-3 py-2 text-sm ${style}`}
      title={title}
    >
      <div className="flex items-center gap-2">
        {isRecursive ? (
          <span
            title="recursive call — not auto-expanded"
            className="text-violet-300"
          >
            ↻ {node.label}
          </span>
        ) : hasPicker ? (
          <button
            type="button"
            onClick={onPick}
            className="text-left text-violet-200"
          >
            {pickerOpen ? "▾" : "▸"} {node.label}
            <span className="ml-1 text-[10px] text-amber-400">
              {candidates.length} candidates
            </span>
          </button>
        ) : call.targetId !== undefined ? (
          <button
            type="button"
            onClick={() => onToggle({ node, fnId: call.targetId ?? "" })}
            className="text-left text-violet-200"
          >
            {expanded === undefined ? "▸" : "▾"} {node.label}
          </button>
        ) : (
          <span className="text-zinc-400">{node.label} (unresolved)</span>
        )}
        <span className="grow" />
        {call.targetId !== undefined && !isRecursive && (
          <button
            type="button"
            onClick={() => onFocus({ fnId: call.targetId ?? "" })}
            className="rounded border border-violet-500/40 px-1.5 text-[10px] text-violet-300 hover:bg-violet-900/40"
            title="promote to main view"
          >
            focus
          </button>
        )}
        <button
          type="button"
          onClick={() => onPeek({ anchor: node.anchor })}
          className="rounded border border-zinc-600 px-1.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
          title="peek source"
        >
          src
        </button>
      </div>
      {pickerOpen && (
        <ul className="mt-2 space-y-1 border-zinc-700 border-l pl-2">
          {candidates.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => onToggle({ node, fnId: c })}
                className="text-left text-[11px] text-violet-300 hover:underline"
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
      {expanded !== undefined && (
        <div className="mt-3 rounded border border-violet-500/30 border-dashed p-3">
          <div className="mb-2 text-[10px] text-zinc-500">
            ↳ {expanded.graph.name} — returns to {graph.name}
          </div>
          <FlowCanvas
            projectId={projectId}
            graph={expanded.graph}
            ancestors={[...ancestors, graph.fnId]}
            onFocus={onFocus}
            onPeek={onPeek}
          />
        </div>
      )}
    </div>
  );
}
