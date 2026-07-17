import { describe, expect, test } from "bun:test";
import { renderSvg } from "./svg";
import type { FlowGraph } from "./types";

const anchor = { file: "src/example.ts", startLine: 1, endLine: 2 };

const graph: FlowGraph = {
  fnId: "src/example.ts#run:1",
  name: "run",
  nodes: [
    { id: "n0", kind: "entry", label: "run", anchor },
    {
      id: "n1",
      kind: "decision",
      label: "value < 1",
      labelFrom: "verbatim",
      anchor,
    },
    {
      id: "n2",
      kind: "exit",
      label: 'throw new Error("bad")',
      labelFrom: "verbatim",
      outcome: "throw",
      anchor,
    },
  ],
  edges: [
    { from: "n0", to: "n1" },
    { from: "n1", to: "n2", label: "yes" },
  ],
};

describe("renderSvg", () => {
  test("emits deterministic standalone SVG with escaped labels", () => {
    const first = renderSvg({ panels: [{ graph, title: "run flow" }] });
    const second = renderSvg({ panels: [{ graph, title: "run flow" }] });

    expect(first).toBe(second);
    expect(first.startsWith('<?xml version="1.0"')).toBe(true);
    expect(first).toContain("value &lt; 1");
    expect(first).toContain('marker-end="url(#arrow)"');
    expect(first).toContain('data-source="src/example.ts:1"');
  });
});
