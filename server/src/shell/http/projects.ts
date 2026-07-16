import { Elysia, t } from "elysia";
import { getProject, openProject } from "../services/projects/store";

export const projectRoutes = new Elysia({ prefix: "/v1" })
  .post(
    "/projects",
    ({ body, set }) => {
      try {
        const project = openProject({ repoPath: body.path });
        return {
          id: project.id,
          root: project.index.root,
          functionCount: project.index.functions.size,
          entrypoints: project.entrypoints,
        };
      } catch (err) {
        set.status = 400;
        return { error: String(err) };
      }
    },
    { body: t.Object({ path: t.String() }) },
  )
  .get("/projects/:id/entrypoints", ({ params, set }) => {
    const project = getProject({ id: params.id });
    if (project === undefined) {
      set.status = 404;
      return { error: "unknown project" };
    }
    return project.entrypoints;
  });
