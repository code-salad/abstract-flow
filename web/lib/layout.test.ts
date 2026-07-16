import { describe, expect, test } from "bun:test";
import { layoutGraph } from "./layout";
import type { FlowGraph } from "./types";

const anchor = { file: "a.ts", startLine: 1, endLine: 1 };

// entry → block → decision →(yes) error exit
//                          →(no)  block → success exit
const graph: FlowGraph = {
  fnId: "a.ts#f:1",
  name: "f",
  nodes: [
    { id: "n0", kind: "entry", label: "f", anchor },
    {
      id: "n1",
      kind: "block",
      label: "b",
      labelFrom: "verbatim",
      anchor,
      calls: [],
    },
    {
      id: "n2",
      kind: "decision",
      label: "!user",
      labelFrom: "verbatim",
      anchor,
    },
    {
      id: "n3",
      kind: "exit",
      label: "return 404",
      labelFrom: "verbatim",
      outcome: "error",
      anchor,
    },
    {
      id: "n4",
      kind: "block",
      label: "work",
      labelFrom: "verbatim",
      anchor,
      calls: [],
    },
    {
      id: "n5",
      kind: "exit",
      label: "return ok",
      labelFrom: "verbatim",
      outcome: "success",
      anchor,
    },
  ],
  edges: [
    { from: "n0", to: "n1" },
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3", label: "yes" },
    { from: "n2", to: "n4", label: "no" },
    { from: "n4", to: "n5" },
  ],
};

describe("layoutGraph", () => {
  test("happy path stays on the spine, error exit goes sideways", () => {
    const { col } = layoutGraph({ graph });
    expect(col.get("n0")).toBe(0);
    expect(col.get("n1")).toBe(0);
    expect(col.get("n2")).toBe(0);
    expect(col.get("n4")).toBe(0); // continuation keeps the spine
    expect(col.get("n5")).toBe(0); // success exit on the spine
    expect(col.get("n3")).toBe(1); // error exit pushed sideways
  });

  test("layers follow longest path, every node placed exactly once", () => {
    const { layers } = layoutGraph({ graph });
    const placed = layers.flat();
    expect(placed.length).toBe(graph.nodes.length);
    expect(new Set(placed).size).toBe(graph.nodes.length);
    expect(layers[0]).toEqual(["n0"]);
  });

  test("back edges do not create layers", () => {
    const withLoop: FlowGraph = {
      ...graph,
      edges: [...graph.edges, { from: "n4", to: "n1", back: true }],
    };
    expect(layoutGraph({ graph: withLoop }).layers).toEqual(
      layoutGraph({ graph }).layers,
    );
  });

  test("deterministic", () => {
    expect(layoutGraph({ graph })).toEqual(layoutGraph({ graph }));
  });
});

test("loop continuation keeps the spine, body indents", () => {
  const loopGraph: FlowGraph = {
    fnId: "a.ts#g:1",
    name: "g",
    nodes: [
      { id: "n0", kind: "entry", label: "g", anchor },
      { id: "n1", kind: "loop", label: "for", labelFrom: "verbatim", anchor },
      {
        id: "n2",
        kind: "block",
        label: "body",
        labelFrom: "verbatim",
        anchor,
        calls: [],
      },
      {
        id: "n3",
        kind: "exit",
        label: "done",
        labelFrom: "verbatim",
        outcome: "success",
        anchor,
      },
    ],
    edges: [
      { from: "n0", to: "n1" },
      { from: "n1", to: "n2", label: "each" },
      { from: "n2", to: "n1", back: true },
      { from: "n1", to: "n3", label: "done" },
    ],
  };
  const { col } = layoutGraph({ graph: loopGraph });
  expect(col.get("n3")).toBe(0);
  expect(col.get("n2")).toBe(1);
});
