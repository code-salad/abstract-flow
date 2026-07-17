import path from "node:path";
import { Elysia, t } from "elysia";
import ts from "typescript";
import { getProject } from "../services/projects/store";

// F8: source peek. Trust boundary — only files the index knows about are
// readable, which also rules out path traversal.

type SourceTokenKind = "plain" | "keyword" | "string" | "number" | "comment";

type SourceToken = { text: string; kind: SourceTokenKind };

const tokenKind = ({ kind }: { kind: ts.SyntaxKind }): SourceTokenKind => {
  if (
    kind === ts.SyntaxKind.SingleLineCommentTrivia ||
    kind === ts.SyntaxKind.MultiLineCommentTrivia ||
    kind === ts.SyntaxKind.ShebangTrivia
  ) {
    return "comment";
  }
  if (
    kind === ts.SyntaxKind.StringLiteral ||
    kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
    kind === ts.SyntaxKind.TemplateHead ||
    kind === ts.SyntaxKind.TemplateMiddle ||
    kind === ts.SyntaxKind.TemplateTail ||
    kind === ts.SyntaxKind.RegularExpressionLiteral
  ) {
    return "string";
  }
  if (
    kind === ts.SyntaxKind.NumericLiteral ||
    kind === ts.SyntaxKind.BigIntLiteral
  ) {
    return "number";
  }
  return kind >= ts.SyntaxKind.FirstKeyword && kind <= ts.SyntaxKind.LastKeyword
    ? "keyword"
    : "plain";
};

export function tokenizeSource({
  file,
  text,
}: {
  file: string;
  text: string;
}): SourceToken[][] {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    [".tsx", ".jsx"].includes(path.extname(file).toLowerCase())
      ? ts.LanguageVariant.JSX
      : ts.LanguageVariant.Standard,
    text,
  );
  const lines: SourceToken[][] = [[]];
  const append = ({
    token,
    kind,
  }: {
    token: string;
    kind: SourceTokenKind;
  }) => {
    for (const part of token.split(/(\r\n|\n|\r)/)) {
      if (part === "\r\n" || part === "\n" || part === "\r") {
        lines.push([]);
      } else if (part !== "") {
        lines[lines.length - 1]?.push({ text: part, kind });
      }
    }
  };

  for (
    let kind = scanner.scan();
    kind !== ts.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  ) {
    append({ token: scanner.getTokenText(), kind: tokenKind({ kind }) });
  }
  return lines;
}

export const sourceRoutes = new Elysia({ prefix: "/v1" }).get(
  "/projects/:id/source",
  async ({ params, query, set }) => {
    const project = getProject({ id: params.id });
    if (project === undefined) {
      set.status = 404;
      return { error: "unknown project" };
    }
    if (!project.index.files.includes(query.file)) {
      set.status = 404;
      return { error: "unknown file" };
    }
    const abs = path.join(project.index.root, query.file);
    const text = await Bun.file(abs).text();
    const all = tokenizeSource({ file: query.file, text });
    const start = Math.max(1, query.start);
    const end = Math.min(all.length, query.end);
    return {
      file: query.file,
      startLine: start,
      lines: all.slice(start - 1, end),
    };
  },
  {
    query: t.Object({
      file: t.String(),
      start: t.Numeric(),
      end: t.Numeric(),
    }),
  },
);
