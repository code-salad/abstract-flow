import path from "node:path";
import { Elysia, t } from "elysia";
import { getProject } from "../services/projects/store";

// F8: source peek. Trust boundary — only files the index knows about are
// readable, which also rules out path traversal.

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
    const all = text.split("\n");
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
