import { Elysia, t } from "elysia";
import { getFlow, getProject } from "../services/projects/store";

export const flowRoutes = new Elysia({ prefix: "/v1" }).get(
  "/projects/:id/flows",
  ({ params, query, set }) => {
    const project = getProject({ id: params.id });
    if (project === undefined) {
      set.status = 404;
      return { error: "unknown project" };
    }
    const graph = getFlow({ project, fnId: query.fn });
    if (graph === undefined) {
      set.status = 404;
      return { error: `unknown function: ${query.fn}` };
    }
    return graph;
  },
  { query: t.Object({ fn: t.String() }) },
);
