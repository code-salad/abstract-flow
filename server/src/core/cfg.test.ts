import { describe, expect, test } from "bun:test";
import { buildCfg } from "./cfg";
import type { CallRef, FlowGraph, NormFunction, NormStmt } from "./types";

const anchor = { file: "a.ts", startLine: 1, endLine: 1 };

const fnWith = (body: NormStmt[]): NormFunction => ({
  id: "a.ts#f:1",
  name: "f",
  anchor,
  exported: true,
  body,
});

const plain = ({
  text,
  calls = [],
}: {
  text: string;
  calls?: CallRef[];
}): NormStmt => ({
  kind: "plain",
  text,
  anchor,
  calls,
});

const firstParty = (name: string): CallRef => ({
  name,
  targetId: `b.ts#${name}:1`,
  external: false,
  anchor,
});

const external = (name: string): CallRef => ({ name, external: true, anchor });

const kinds = (g: FlowGraph) => g.nodes.map((n) => n.kind);
const edge = ({ g, from, to }: { g: FlowGraph; from: string; to: string }) =>
  g.edges.find((e) => e.from === from && e.to === to);

describe("buildCfg", () => {
  test("straight-line statements collapse into one block (F5)", () => {
    const g = buildCfg({
      fn: fnWith([
        plain({ text: "const a = 1" }),
        plain({ text: "const b = 2" }),
        plain({ text: "const c = a + b" }),
      ]),
    });
    expect(kinds(g)).toEqual(["entry", "block", "exit"]);
    const block = g.nodes[1];
    expect(block?.anchor).toEqual(anchor);
  });

  test("if produces a decision with yes/no edges that converge (F6)", () => {
    const g = buildCfg({
      fn: fnWith([
        {
          kind: "if",
          cond: "!user",
          anchor,
          thenBranch: [
            {
              kind: "return",
              text: "return null",
              anchor,
              calls: [],
              isError: false,
            },
          ],
        },
        plain({ text: "const y = 2" }),
      ]),
    });
    expect(kinds(g)).toEqual(["entry", "decision", "exit", "block", "exit"]);
    expect(edge({ g, from: "n1", to: "n2" })?.label).toBe("yes");
    expect(edge({ g, from: "n1", to: "n3" })?.label).toBe("no");
  });

  test("first-party call breaks the block into an expandable call node (F10/F13)", () => {
    const g = buildCfg({
      fn: fnWith([
        plain({
          text: "const u = findUser({ id })",
          calls: [firstParty("findUser")],
        }),
        plain({ text: "const z = 1" }),
      ]),
    });
    expect(kinds(g)).toEqual(["entry", "call", "block", "exit"]);
  });

  test("external calls stay demoted inside the block (F13)", () => {
    const g = buildCfg({
      fn: fnWith([
        plain({ text: "log.info('x')", calls: [external("log.info")] }),
      ]),
    });
    expect(kinds(g)).toEqual(["entry", "block", "exit"]);
    const block = g.nodes[1];
    if (block?.kind !== "block") throw new Error("expected block");
    expect(block.calls.map((c) => c.name)).toEqual(["log.info"]);
  });

  test("loop gets a back edge, not a layout ring (F7)", () => {
    const g = buildCfg({
      fn: fnWith([
        {
          kind: "loop",
          header: "for (const i of items)",
          anchor,
          body: [plain({ text: "sum += i" })],
        },
      ]),
    });
    expect(kinds(g)).toEqual(["entry", "loop", "block", "exit"]);
    expect(edge({ g, from: "n2", to: "n1" })?.back).toBe(true);
    expect(edge({ g, from: "n1", to: "n3" })?.label).toBe("done");
  });

  test("throw and 4xx returns are error-outcome exits (F6)", () => {
    const g = buildCfg({
      fn: fnWith([
        {
          kind: "if",
          cond: "!cart",
          anchor,
          thenBranch: [
            {
              kind: "return",
              text: "return res.status(400).json({})",
              anchor,
              calls: [],
              isError: false,
            },
          ],
        },
        { kind: "throw", text: "throw new Error('boom')", anchor, calls: [] },
      ]),
    });
    const exits = g.nodes.flatMap((n) =>
      n.kind === "exit" ? [n.outcome] : [],
    );
    expect(exits).toEqual(["error", "throw"]);
  });

  test("try/catch shows both paths explicitly (honesty principle)", () => {
    const g = buildCfg({
      fn: fnWith([
        {
          kind: "try",
          anchor,
          body: [plain({ text: "const r = 1" })],
          catchParam: "err",
          handler: [
            {
              kind: "return",
              text: "return res.status(502).json({})",
              anchor,
              calls: [],
              isError: true,
            },
          ],
        },
      ]),
    });
    expect(kinds(g)).toEqual(["entry", "decision", "block", "exit", "exit"]);
    expect(edge({ g, from: "n1", to: "n2" })?.label).toBe("ok");
    expect(edge({ g, from: "n1", to: "n3" })?.label).toBe("throws (err)");
  });

  test("calls inside a return are still expandable before the exit", () => {
    const g = buildCfg({
      fn: fnWith([
        {
          kind: "return",
          text: "return charge()",
          anchor,
          calls: [firstParty("charge")],
          isError: false,
        },
      ]),
    });
    expect(kinds(g)).toEqual(["entry", "call", "exit"]);
  });

  test("deterministic: same input, same graph", () => {
    const body: NormStmt[] = [
      {
        kind: "if",
        cond: "a",
        anchor,
        thenBranch: [plain({ text: "x()" })],
        else: [plain({ text: "y()" })],
      },
    ];
    expect(buildCfg({ fn: fnWith(body) })).toEqual(
      buildCfg({ fn: fnWith(body) }),
    );
  });
});
