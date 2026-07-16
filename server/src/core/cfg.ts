import { deriveLabel, truncate } from "./labels";
import type {
  CallRef,
  FlowEdge,
  FlowGraph,
  FlowNode,
  NormFunction,
  NormStmt,
  SourceAnchor,
} from "./types";

// F5/F6/F7: branch-level CFG. Straight-line statements collapse into one block;
// decisions, loops, exits, and first-party calls break blocks. Every node/edge
// here is derived from the normalized AST — nothing is guessed.

type Pending = { from: string; label?: string };

const ERROR_STATUS = /\.status\(\s*[45]\d\d\s*\)/;

// Expandable spine node = there is something to expand into: a resolved
// project function or an F11 candidate set. In-project calls that resolve to
// type signatures (res.json, callbacks) demote to block fine-print like
// externals (F13).
function isInteresting({ call }: { call: CallRef }): boolean {
  return call.targetId !== undefined || (call.candidates?.length ?? 0) > 0;
}

export function buildCfg({ fn }: { fn: NormFunction }): FlowGraph {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let counter = 0;

  const push = (node: FlowNode): string => {
    nodes.push(node);
    return node.id;
  };
  const nextId = (): string => {
    const id = `n${counter}`;
    counter += 1;
    return id;
  };

  const connect = ({
    incoming,
    to,
    back,
  }: {
    incoming: Pending[];
    to: string;
    back?: boolean;
  }) => {
    for (const p of incoming) {
      const edge: FlowEdge = { from: p.from, to };
      if (p.label !== undefined) {
        edge.label = p.label;
      }
      if (back === true) {
        edge.back = true;
      }
      edges.push(edge);
    }
  };

  type Buffered = {
    text: string;
    anchor: SourceAnchor;
    calls: CallRef[];
    comment?: string;
  };

  const emitSeq = ({
    stmts,
    incoming,
  }: {
    stmts: NormStmt[];
    incoming: Pending[];
  }): Pending[] => {
    let current = incoming;
    let buffer: Buffered[] = [];

    const flush = () => {
      const first = buffer[0];
      const last = buffer[buffer.length - 1];
      if (first === undefined || last === undefined) {
        return;
      }
      const calls = buffer.flatMap((b) => b.calls);
      const text = buffer.map((b) => b.text).join("; ");
      const { label, from } = deriveLabel({
        comment: first.comment,
        calls,
        text,
      });
      const id = push({
        id: nextId(),
        kind: "block",
        label,
        labelFrom: from,
        anchor: {
          file: first.anchor.file,
          startLine: first.anchor.startLine,
          endLine: last.anchor.endLine,
        },
        calls,
      });
      connect({ incoming: current, to: id });
      current = [{ from: id }];
      buffer = [];
    };

    // First-party calls become their own expandable spine nodes (F10/F13).
    const emitCalls = ({ calls }: { calls: CallRef[] }) => {
      for (const call of calls) {
        if (!isInteresting({ call })) {
          continue;
        }
        const id = push({
          id: nextId(),
          kind: "call",
          label: truncate({ text: `${call.name}()` }),
          call,
          anchor: call.anchor,
        });
        connect({ incoming: current, to: id });
        current = [{ from: id }];
      }
    };

    for (const stmt of stmts) {
      if (stmt.kind === "plain") {
        const interesting = stmt.calls.filter((call) =>
          isInteresting({ call }),
        );
        const boring = stmt.calls.filter((call) => !isInteresting({ call }));
        if (interesting.length === 0) {
          const entry: Buffered = {
            text: stmt.text,
            anchor: stmt.anchor,
            calls: boring,
          };
          if (stmt.comment !== undefined) {
            entry.comment = stmt.comment;
          }
          buffer.push(entry);
          continue;
        }
        flush();
        emitCalls({ calls: stmt.calls });
        continue;
      }

      flush();

      if (stmt.kind === "if") {
        const { label, from } = deriveLabel({
          comment: stmt.comment,
          calls: [],
          text: stmt.cond,
        });
        const dec = push({
          id: nextId(),
          kind: "decision",
          label,
          labelFrom: from,
          anchor: stmt.anchor,
        });
        connect({ incoming: current, to: dec });
        const thenOuts = emitSeq({
          stmts: stmt.thenBranch,
          incoming: [{ from: dec, label: "yes" }],
        });
        const elseOuts =
          stmt.else === undefined
            ? [{ from: dec, label: "no" }]
            : emitSeq({
                stmts: stmt.else,
                incoming: [{ from: dec, label: "no" }],
              });
        current = [...thenOuts, ...elseOuts];
        continue;
      }

      if (stmt.kind === "loop") {
        const { label, from } = deriveLabel({
          comment: stmt.comment,
          calls: [],
          text: stmt.header,
        });
        const loop = push({
          id: nextId(),
          kind: "loop",
          label,
          labelFrom: from,
          anchor: stmt.anchor,
        });
        connect({ incoming: current, to: loop });
        const bodyOuts = emitSeq({
          stmts: stmt.body,
          incoming: [{ from: loop, label: "each" }],
        });
        connect({ incoming: bodyOuts, to: loop, back: true });
        current = [{ from: loop, label: "done" }];
        continue;
      }

      if (stmt.kind === "return") {
        emitCalls({ calls: stmt.calls });
        const outcome =
          stmt.isError || ERROR_STATUS.test(stmt.text) ? "error" : "success";
        const { label, from } = deriveLabel({
          comment: stmt.comment,
          calls: [],
          text: stmt.text,
        });
        const id = push({
          id: nextId(),
          kind: "exit",
          label,
          labelFrom: from,
          outcome,
          anchor: stmt.anchor,
        });
        connect({ incoming: current, to: id });
        current = [];
        continue;
      }

      if (stmt.kind === "throw") {
        emitCalls({ calls: stmt.calls });
        const { label, from } = deriveLabel({
          comment: stmt.comment,
          calls: [],
          text: stmt.text,
        });
        const id = push({
          id: nextId(),
          kind: "exit",
          label,
          labelFrom: from,
          outcome: "throw",
          anchor: stmt.anchor,
        });
        connect({ incoming: current, to: id });
        current = [];
        continue;
      }

      // try/catch: both paths exist in the source; show both explicitly (F6).
      const dec = push({
        id: nextId(),
        kind: "decision",
        label: "try",
        labelFrom: "verbatim",
        anchor: stmt.anchor,
      });
      connect({ incoming: current, to: dec });
      const okOuts = emitSeq({
        stmts: stmt.body,
        incoming: [{ from: dec, label: "ok" }],
      });
      const catchLabel =
        stmt.catchParam === undefined
          ? "throws"
          : `throws (${stmt.catchParam})`;
      const errOuts = emitSeq({
        stmts: stmt.handler,
        incoming: [{ from: dec, label: catchLabel }],
      });
      current = [...okOuts, ...errOuts];
    }

    flush();
    return current;
  };

  const entryId = push({
    id: nextId(),
    kind: "entry",
    label: fn.name,
    anchor: fn.anchor,
  });
  const outs = emitSeq({ stmts: fn.body, incoming: [{ from: entryId }] });
  if (outs.length > 0) {
    const id = push({
      id: nextId(),
      kind: "exit",
      label: "return",
      labelFrom: "verbatim",
      outcome: "success",
      anchor: {
        file: fn.anchor.file,
        startLine: fn.anchor.endLine,
        endLine: fn.anchor.endLine,
      },
    });
    connect({ incoming: outs, to: id });
  }

  return { fnId: fn.id, name: fn.name, nodes, edges };
}
