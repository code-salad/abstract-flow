import { expect, test } from "bun:test";
import { filterEntrypoints } from "./entrypoint-search";

const entrypoints = {
  routes: [
    {
      method: "GET",
      path: "/users",
      functionId: "users",
      anchor: { file: "src/users.ts", startLine: 1, endLine: 2 },
    },
  ],
  exports: [{ functionId: "billing", name: "chargeCard", inboundCalls: 2 }],
};

test("filters routes and functions by a single query", () => {
  expect(
    filterEntrypoints({ entrypoints, query: "users" }).routes,
  ).toHaveLength(1);
  expect(
    filterEntrypoints({ entrypoints, query: "charge" }).exports,
  ).toHaveLength(1);
  expect(
    filterEntrypoints({ entrypoints, query: "missing" }).routes,
  ).toHaveLength(0);
});
