// Domain vocabulary. Providers normalize compiler ASTs INTO these types;
// core never imports a compiler API.

export type SourceAnchor = { file: string; startLine: number; endLine: number };

export type CallRef = {
  name: string;
  targetId?: string;
  candidates?: string[];
  external: boolean;
  anchor: SourceAnchor;
};

export type NormStmt =
  | {
      kind: "plain";
      text: string;
      anchor: SourceAnchor;
      calls: CallRef[];
      comment?: string;
    }
  | {
      kind: "if";
      cond: string;
      anchor: SourceAnchor;
      comment?: string;
      thenBranch: NormStmt[];
      else?: NormStmt[];
    }
  | {
      kind: "loop";
      header: string;
      anchor: SourceAnchor;
      comment?: string;
      body: NormStmt[];
    }
  | {
      kind: "return";
      text: string;
      anchor: SourceAnchor;
      comment?: string;
      calls: CallRef[];
      isError: boolean;
    }
  | {
      kind: "throw";
      text: string;
      anchor: SourceAnchor;
      comment?: string;
      calls: CallRef[];
    }
  | {
      kind: "try";
      anchor: SourceAnchor;
      comment?: string;
      body: NormStmt[];
      catchParam?: string;
      handler: NormStmt[];
    };

export type NormFunction = {
  id: string;
  name: string;
  anchor: SourceAnchor;
  exported: boolean;
  body: NormStmt[];
};

export type LabelSource = "comment" | "call" | "verbatim";
export type ExitOutcome = "success" | "error" | "throw";

export type FlowNode =
  | { id: string; kind: "entry"; label: string; anchor: SourceAnchor }
  | {
      id: string;
      kind: "block";
      label: string;
      labelFrom: LabelSource;
      anchor: SourceAnchor;
      calls: CallRef[];
    }
  | {
      id: string;
      kind: "decision";
      label: string;
      labelFrom: LabelSource;
      anchor: SourceAnchor;
    }
  | {
      id: string;
      kind: "call";
      label: string;
      call: CallRef;
      anchor: SourceAnchor;
    }
  | {
      id: string;
      kind: "loop";
      label: string;
      labelFrom: LabelSource;
      anchor: SourceAnchor;
    }
  | {
      id: string;
      kind: "exit";
      label: string;
      outcome: ExitOutcome;
      anchor: SourceAnchor;
      labelFrom: LabelSource;
    };

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
  back?: boolean;
};

export type FlowGraph = {
  fnId: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

// Raw call-site facts extracted by a provider; entry-point rules run over these.
export type RawCallSite = {
  calleeText: string;
  firstArgString?: string;
  handlerTargetId?: string;
  anchor: SourceAnchor;
};

export type RouteEntry = {
  method: string;
  path: string;
  functionId: string;
  anchor: SourceAnchor;
};

export type ExportEntry = {
  functionId: string;
  name: string;
  inboundCalls: number;
};

export type Entrypoints = { routes: RouteEntry[]; exports: ExportEntry[] };
