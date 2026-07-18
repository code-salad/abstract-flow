import { readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { cleanComment } from "../../core/labels";
import type {
  CallRef,
  NormFunction,
  NormStmt,
  RawCallSite,
  SourceAnchor,
} from "../../core/types";

// Provider: the ONLY place that touches the TypeScript compiler API.
// It normalizes ts.Node trees into core types; core never sees a ts.Node.

export type ProjectIndex = {
  root: string;
  files: string[];
  functions: Map<string, NormFunction>;
  callSites: RawCallSite[];
  inbound: Map<string, number>;
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"]);

function listSourceFiles({ root }: { root: string }): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          walk(path.join(dir, entry.name));
        }
        continue;
      }
      const ext = path.extname(entry.name);
      if (EXTS.has(ext) && !entry.name.endsWith(".d.ts")) {
        found.push(path.join(dir, entry.name));
      }
    }
  };
  walk(root);
  return found.sort();
}

type Ctx = {
  root: string;
  checker: ts.TypeChecker;
  sf: ts.SourceFile;
  functions: Map<string, NormFunction>;
  callSites: RawCallSite[];
  fnIdByNode: Map<ts.Node, string>;
};

function anchorOf({ ctx, node }: { ctx: Ctx; node: ts.Node }): SourceAnchor {
  const start = ctx.sf.getLineAndCharacterOfPosition(node.getStart(ctx.sf));
  const end = ctx.sf.getLineAndCharacterOfPosition(node.getEnd());
  return {
    file: path.relative(ctx.root, ctx.sf.fileName),
    startLine: start.line + 1,
    endLine: end.line + 1,
  };
}

function leadingComment({
  ctx,
  node,
}: {
  ctx: Ctx;
  node: ts.Node;
}): string | undefined {
  const text = ctx.sf.getFullText();
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart());
  const last = ranges?.[ranges.length - 1];
  if (last === undefined) {
    return undefined;
  }
  const cleaned = cleanComment({ raw: text.slice(last.pos, last.end) });
  return cleaned === "" ? undefined : cleaned;
}

function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  );
}

// Collect call expressions inside a statement, without descending into nested
// function bodies (their calls belong to that function's own flow).
function collectCalls({ ctx, node }: { ctx: Ctx; node: ts.Node }): CallRef[] {
  const calls: CallRef[] = [];
  const visit = (n: ts.Node) => {
    if (isFunctionLike(n)) {
      return;
    }
    if (ts.isCallExpression(n)) {
      calls.push(resolveCall({ ctx, call: n }));
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(node, visit);
  if (ts.isCallExpression(node)) {
    calls.unshift(resolveCall({ ctx, call: node }));
  }
  return calls;
}

function functionIdForDecl({
  ctx,
  decl,
}: {
  ctx: Ctx;
  decl: ts.Node;
}): string | undefined {
  return ctx.fnIdByNode.get(decl);
}

function resolveCall({
  ctx,
  call,
}: {
  ctx: Ctx;
  call: ts.CallExpression;
}): CallRef {
  const name = call.expression.getText(ctx.sf);
  const anchor = anchorOf({ ctx, node: call });
  const sig = ctx.checker.getResolvedSignature(call);
  const decl = sig?.getDeclaration();

  const declToId = (d: ts.Node): { targetId?: string; external: boolean } => {
    const file = d.getSourceFile().fileName;
    if (file.includes("node_modules") || !file.startsWith(ctx.root)) {
      return { external: true };
    }
    const id = functionIdForDecl({ ctx, decl: d });
    return id === undefined
      ? { external: false }
      : { targetId: id, external: false };
  };

  if (decl !== undefined && !ts.isJSDocSignature(decl)) {
    const { targetId, external } = declToId(decl);
    // Dynamic dispatch: symbol with several project declarations → candidates (F11).
    const symbol = ctx.checker.getSymbolAtLocation(call.expression);
    const declIds =
      symbol
        ?.getDeclarations()
        ?.map((d) => functionIdForDecl({ ctx, decl: d }))
        .filter((id): id is string => id !== undefined) ?? [];
    const ref: CallRef = { name, external, anchor };
    if (targetId !== undefined) {
      ref.targetId = targetId;
    }
    if (declIds.length > 1) {
      ref.candidates = declIds;
    }
    return ref;
  }
  // Unresolvable statically: honest "external/unresolved" — never a guess.
  return { name, external: true, anchor };
}

function normalizeStmts({
  ctx,
  stmts,
  insideCatch,
}: {
  ctx: Ctx;
  stmts: readonly ts.Statement[];
  insideCatch: boolean;
}): NormStmt[] {
  const out: NormStmt[] = [];
  for (const stmt of stmts) {
    out.push(...normalizeStmt({ ctx, stmt, insideCatch }));
  }
  return out;
}

function headerText({
  ctx,
  stmt,
  body,
}: {
  ctx: Ctx;
  stmt: ts.Node;
  body: ts.Node;
}): string {
  const full = ctx.sf.getFullText();
  return full.slice(stmt.getStart(ctx.sf), body.getStart(ctx.sf)).trim();
}

function bodyStatements(node: ts.Statement): readonly ts.Statement[] {
  return ts.isBlock(node) ? node.statements : [node];
}

function normalizeStmt({
  ctx,
  stmt,
  insideCatch,
}: {
  ctx: Ctx;
  stmt: ts.Statement;
  insideCatch: boolean;
}): NormStmt[] {
  const anchor = anchorOf({ ctx, node: stmt });
  const comment = leadingComment({ ctx, node: stmt });
  const withComment = <T extends NormStmt>(n: T): T =>
    comment === undefined ? n : { ...n, comment };

  if (ts.isBlock(stmt)) {
    return normalizeStmts({ ctx, stmts: stmt.statements, insideCatch });
  }

  if (ts.isIfStatement(stmt)) {
    const norm: NormStmt = withComment({
      kind: "if",
      cond: stmt.expression.getText(ctx.sf),
      anchor,
      thenBranch: normalizeStmts({
        ctx,
        stmts: bodyStatements(stmt.thenStatement),
        insideCatch,
      }),
    });
    if (stmt.elseStatement !== undefined && norm.kind === "if") {
      norm.else = normalizeStmts({
        ctx,
        stmts: bodyStatements(stmt.elseStatement),
        insideCatch,
      });
    }
    return [norm];
  }

  if (
    ts.isForStatement(stmt) ||
    ts.isForOfStatement(stmt) ||
    ts.isForInStatement(stmt) ||
    ts.isWhileStatement(stmt) ||
    ts.isDoStatement(stmt)
  ) {
    return [
      withComment({
        kind: "loop",
        header: headerText({ ctx, stmt, body: stmt.statement }),
        anchor,
        body: normalizeStmts({
          ctx,
          stmts: bodyStatements(stmt.statement),
          insideCatch,
        }),
      }),
    ];
  }

  if (ts.isReturnStatement(stmt)) {
    return [
      withComment({
        kind: "return",
        text: stmt.getText(ctx.sf),
        anchor,
        calls: collectCalls({ ctx, node: stmt }),
        isError: insideCatch,
      }),
    ];
  }

  if (ts.isThrowStatement(stmt)) {
    return [
      withComment({
        kind: "throw",
        text: stmt.getText(ctx.sf),
        anchor,
        calls: collectCalls({ ctx, node: stmt }),
      }),
    ];
  }

  if (ts.isTryStatement(stmt)) {
    const norm: NormStmt = withComment({
      kind: "try",
      anchor,
      body: normalizeStmts({
        ctx,
        stmts: stmt.tryBlock.statements,
        insideCatch,
      }),
      handler:
        stmt.catchClause === undefined
          ? []
          : normalizeStmts({
              ctx,
              stmts: stmt.catchClause.block.statements,
              insideCatch: true,
            }),
    });
    const param = stmt.catchClause?.variableDeclaration?.name.getText(ctx.sf);
    if (param !== undefined && norm.kind === "try") {
      norm.catchParam = param;
    }
    return [norm];
  }

  // switch → if-chain so branches stay visible (folded right-to-left).
  if (ts.isSwitchStatement(stmt)) {
    const subject = stmt.expression.getText(ctx.sf);
    let elseBranch: NormStmt[] | undefined;
    const clauses = [...stmt.caseBlock.clauses].reverse();
    for (const clause of clauses) {
      const body = normalizeStmts({
        ctx,
        stmts: clause.statements,
        insideCatch,
      });
      if (ts.isDefaultClause(clause)) {
        elseBranch = body;
        continue;
      }
      const cond = `${subject} === ${clause.expression.getText(ctx.sf)}`;
      const branch: NormStmt = {
        kind: "if",
        cond,
        anchor: anchorOf({ ctx, node: clause }),
        thenBranch: body,
      };
      if (elseBranch !== undefined && branch.kind === "if") {
        branch.else = elseBranch;
      }
      elseBranch = [branch];
    }
    return elseBranch === undefined
      ? []
      : elseBranch.map((n) => withComment(n));
  }

  return [
    withComment({
      kind: "plain",
      text: stmt.getText(ctx.sf),
      anchor,
      calls: collectCalls({ ctx, node: stmt }),
    }),
  ];
}

function isExported(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }
  return (ts.getModifiers(node) ?? []).some(
    (m) => m.kind === ts.SyntaxKind.ExportKeyword,
  );
}

type Discovered = {
  name: string;
  bodyNode: ts.Node;
  declNode: ts.Node;
  exported: boolean;
};

// Pass 1: find every function worth indexing (named decls, const arrows,
// methods, and inline route handlers) so call resolution can map decl → id.
function discoverFunctions({ ctx }: { ctx: Ctx }): Discovered[] {
  const found: Discovered[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name !== undefined &&
      node.body !== undefined
    ) {
      found.push({
        name: node.name.text,
        bodyNode: node,
        declNode: node,
        exported: isExported(node),
      });
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const init = decl.initializer;
        if (
          init !== undefined &&
          (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
          ts.isIdentifier(decl.name)
        ) {
          found.push({
            name: decl.name.text,
            bodyNode: init,
            declNode: decl,
            exported: isExported(node),
          });
        }
      }
    } else if (
      ts.isMethodDeclaration(node) &&
      node.body !== undefined &&
      ts.isIdentifier(node.name)
    ) {
      found.push({
        name: node.name.text,
        bodyNode: node,
        declNode: node,
        exported: false,
      });
    } else if (ts.isCallExpression(node)) {
      // Inline route handlers: app.post("/x", (req, res) => …)
      const first = node.arguments[0];
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        first !== undefined &&
        ts.isStringLiteralLike(first)
      ) {
        for (const arg of node.arguments.slice(1)) {
          if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
            const name = `${node.expression.name.text.toUpperCase()} ${first.text}`;
            found.push({ name, bodyNode: arg, declNode: arg, exported: false });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ctx.sf);
  return found;
}

function normalizeBody({
  ctx,
  bodyNode,
}: {
  ctx: Ctx;
  bodyNode: ts.Node;
}): NormStmt[] {
  if (
    (ts.isFunctionDeclaration(bodyNode) ||
      ts.isFunctionExpression(bodyNode) ||
      ts.isMethodDeclaration(bodyNode)) &&
    bodyNode.body !== undefined
  ) {
    return normalizeStmts({
      ctx,
      stmts: bodyNode.body.statements,
      insideCatch: false,
    });
  }
  if (ts.isArrowFunction(bodyNode)) {
    if (ts.isBlock(bodyNode.body)) {
      return normalizeStmts({
        ctx,
        stmts: bodyNode.body.statements,
        insideCatch: false,
      });
    }
    // Expression-bodied arrow: a single implicit return.
    return [
      {
        kind: "return",
        text: bodyNode.body.getText(ctx.sf),
        anchor: anchorOf({ ctx, node: bodyNode.body }),
        calls: collectCalls({ ctx, node: bodyNode.body }),
        isError: false,
      },
    ];
  }
  return [];
}

// Pass 2 helper: raw route-call facts for the pure entry-point rules (F14).
function extractCallSites({ ctx }: { ctx: Ctx }) {
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const first = node.arguments[0];
      const site: RawCallSite = {
        calleeText: node.expression.getText(ctx.sf),
        anchor: anchorOf({ ctx, node }),
      };
      if (first !== undefined && ts.isStringLiteralLike(first)) {
        site.firstArgString = first.text;
      }
      for (const arg of node.arguments.slice(1)) {
        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
          const id = ctx.fnIdByNode.get(arg);
          if (id !== undefined) {
            site.handlerTargetId = id;
          }
        } else if (ts.isIdentifier(arg)) {
          const symbol = ctx.checker.getSymbolAtLocation(arg);
          const target = symbol
            ?.getDeclarations()
            ?.map((d) => ctx.fnIdByNode.get(d))
            .find((id) => id !== undefined);
          if (target !== undefined) {
            site.handlerTargetId = target;
          }
        }
      }
      ctx.callSites.push(site);
    }
    ts.forEachChild(node, visit);
  };
  visit(ctx.sf);
}

export function indexProject({ repoPath }: { repoPath: string }): ProjectIndex {
  const root = path.resolve(repoPath);
  const files = listSourceFiles({ root });
  const program = ts.createProgram({
    rootNames: files,
    options: {
      allowJs: true,
      checkJs: false,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: false,
      noEmit: true,
      skipLibCheck: true,
      // ponytail: every project source is already a root; load package
      // declarations only if external calls need to become graph nodes.
      noResolve: true,
      types: [],
    },
  });
  const checker = program.getTypeChecker();

  const functions = new Map<string, NormFunction>();
  const callSites: RawCallSite[] = [];
  const fnIdByNode = new Map<ts.Node, string>();
  const contexts: { ctx: Ctx; discovered: Discovered[] }[] = [];

  // Pass 1 across all files: discover functions and assign ids, so pass 2's
  // call resolution can point at any function in the project.
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !path.resolve(sf.fileName).startsWith(root)) {
      continue;
    }
    const ctx: Ctx = { root, checker, sf, functions, callSites, fnIdByNode };
    const discovered = discoverFunctions({ ctx });
    for (const d of discovered) {
      const line =
        sf.getLineAndCharacterOfPosition(d.declNode.getStart(sf)).line + 1;
      const id = `${path.relative(root, sf.fileName)}#${d.name}:${line}`;
      fnIdByNode.set(d.declNode, id);
      fnIdByNode.set(d.bodyNode, id);
    }
    contexts.push({ ctx, discovered });
  }

  // Pass 2: normalize bodies (call resolution can now map decls to ids).
  for (const { ctx, discovered } of contexts) {
    for (const d of discovered) {
      const id = fnIdByNode.get(d.declNode);
      if (id === undefined) {
        continue;
      }
      functions.set(id, {
        id,
        name: d.name,
        anchor: anchorOf({ ctx, node: d.bodyNode }),
        exported: d.exported,
        body: normalizeBody({ ctx, bodyNode: d.bodyNode }),
      });
    }
    extractCallSites({ ctx });
  }

  // Inbound call counts for F15 ranking.
  const inbound = new Map<string, number>();
  const countCalls = (stmts: NormStmt[]) => {
    for (const s of stmts) {
      const calls =
        s.kind === "plain" || s.kind === "return" || s.kind === "throw"
          ? s.calls
          : [];
      for (const c of calls) {
        if (c.targetId !== undefined) {
          inbound.set(c.targetId, (inbound.get(c.targetId) ?? 0) + 1);
        }
      }
      if (s.kind === "if") {
        countCalls(s.thenBranch);
        countCalls(s.else ?? []);
      } else if (s.kind === "loop") {
        countCalls(s.body);
      } else if (s.kind === "try") {
        countCalls(s.body);
        countCalls(s.handler);
      }
    }
  };
  for (const fn of functions.values()) {
    countCalls(fn.body);
  }

  return {
    root,
    files: files.map((f) => path.relative(root, f)),
    functions,
    callSites,
    inbound,
  };
}
