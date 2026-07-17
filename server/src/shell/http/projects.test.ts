import { expect, test } from "bun:test";
import { app } from "../../index";

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
