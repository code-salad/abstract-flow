import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { flowRoutes } from "./shell/http/flows";
import { projectRoutes } from "./shell/http/projects";
import { sourceRoutes } from "./shell/http/source";
import { env } from "./shell/lib/env";

export const app = new Elysia()
  .use(openapi({ path: "/v1/docs" }))
  .get("/health", () => ({ ok: true }))
  .use(projectRoutes)
  .use(flowRoutes)
  .use(sourceRoutes);

if (import.meta.main) {
  app.listen(env.PORT);
  console.log(`abstract-flow api on :${env.PORT}`);
}
