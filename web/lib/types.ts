import { z } from "zod";

// Single source of wire shapes: zod schemas parse API responses at the
// boundary (no casts), and the TS types are inferred from them.
// ponytail: hand-mirrored from server/src/core/types.ts; swap for Hey API
// codegen from server/openapi.json when the API surface grows.

export const sourceAnchor = z.object({
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
});

export const callRef = z.object({
  name: z.string(),
  targetId: z.string().optional(),
  candidates: z.array(z.string()).optional(),
  external: z.boolean(),
  anchor: sourceAnchor,
});

const labelSource = z.enum(["comment", "call", "verbatim"]);
const exitOutcome = z.enum(["success", "error", "throw"]);

export const flowNode = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    kind: z.literal("entry"),
    label: z.string(),
    anchor: sourceAnchor,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("block"),
    label: z.string(),
    labelFrom: labelSource,
    anchor: sourceAnchor,
    calls: z.array(callRef),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("decision"),
    label: z.string(),
    labelFrom: labelSource,
    anchor: sourceAnchor,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("call"),
    label: z.string(),
    call: callRef,
    anchor: sourceAnchor,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("loop"),
    label: z.string(),
    labelFrom: labelSource,
    anchor: sourceAnchor,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("exit"),
    label: z.string(),
    labelFrom: labelSource,
    outcome: exitOutcome,
    anchor: sourceAnchor,
  }),
]);

export const flowEdge = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  back: z.boolean().optional(),
});

export const flowGraph = z.object({
  fnId: z.string(),
  name: z.string(),
  nodes: z.array(flowNode),
  edges: z.array(flowEdge),
});

export const routeEntry = z.object({
  method: z.string(),
  path: z.string(),
  functionId: z.string(),
  anchor: sourceAnchor,
});

export const exportEntry = z.object({
  functionId: z.string(),
  name: z.string(),
  inboundCalls: z.number(),
});

export const entrypoints = z.object({
  routes: z.array(routeEntry),
  exports: z.array(exportEntry),
});

export const projectInfo = z.object({
  id: z.string(),
  root: z.string(),
  functionCount: z.number(),
  entrypoints,
});

export const sourcePeek = z.object({
  file: z.string(),
  startLine: z.number(),
  lines: z.array(z.string()),
});

export type SourceAnchor = z.infer<typeof sourceAnchor>;
export type CallRef = z.infer<typeof callRef>;
export type FlowNode = z.infer<typeof flowNode>;
export type FlowEdge = z.infer<typeof flowEdge>;
export type FlowGraph = z.infer<typeof flowGraph>;
export type RouteEntry = z.infer<typeof routeEntry>;
export type ExportEntry = z.infer<typeof exportEntry>;
export type Entrypoints = z.infer<typeof entrypoints>;
export type ProjectInfo = z.infer<typeof projectInfo>;
export type SourcePeek = z.infer<typeof sourcePeek>;
