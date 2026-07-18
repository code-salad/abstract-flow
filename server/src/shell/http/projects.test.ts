import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { app } from "../../index";
import { openProject } from "../services/projects/store";

test("opens the working directory when no project path is supplied", async () => {
  const response = await app.handle(
    new Request("http://localhost/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ root: process.cwd() });
});

test("reuses an index until reindexing is forced", () => {
  const repoPath = resolve(
    import.meta.dir,
    "../../../../examples/express-demo",
  );
  const first = openProject({ repoPath, force: true });

  expect(openProject({ repoPath })).toBe(first);
  expect(openProject({ repoPath, force: true })).not.toBe(first);
});
