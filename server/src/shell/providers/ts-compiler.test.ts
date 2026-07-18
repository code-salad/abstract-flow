import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildCfg } from "../../core/cfg";
import { indexProject } from "./ts-compiler";

test("resolves first-party calls without package declaration files", () => {
  const repoPath = resolve(
    import.meta.dir,
    "../../../../examples/express-demo",
  );
  const index = indexProject({ repoPath });
  const checkout = [...index.functions.values()].find(
    ({ name }) => name === "POST /checkout",
  );
  if (checkout === undefined) {
    throw new Error("checkout route was not indexed");
  }

  const calls = buildCfg({ fn: checkout })
    .nodes.filter((node) => node.kind === "call")
    .map((node) => node.call.targetId);

  expect(calls).toContain("src/users.ts#findUser:5");
  expect(calls).toContain("src/billing.ts#chargeCard:6");
});
