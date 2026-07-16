import { describe, expect, test } from "bun:test";
import { detectEntrypoints } from "./entrypoints";
import type { NormFunction, RawCallSite } from "./types";

const anchor = { file: "app.ts", startLine: 5, endLine: 5 };

const fn = (id: string, name: string, exported = true): NormFunction => ({
  id,
  name,
  anchor,
  exported,
  body: [],
});

describe("detectEntrypoints", () => {
  test("finds HTTP routes from call-site facts (F14)", () => {
    const callSites: RawCallSite[] = [
      {
        calleeText: "app.post",
        firstArgString: "/checkout",
        handlerTargetId: "app.ts#handler:8",
        anchor,
      },
      {
        calleeText: "app.get",
        firstArgString: "/balance/:id",
        handlerTargetId: "app.ts#handler:30",
        anchor,
      },
      {
        calleeText: "app.use",
        firstArgString: "/static",
        handlerTargetId: "x",
        anchor,
      },
      { calleeText: "routes.push", anchor },
    ];
    const { routes } = detectEntrypoints({
      functions: [],
      callSites,
      inbound: new Map(),
    });
    expect(routes.map((r) => `${r.method} ${r.path}`)).toEqual([
      "POST /checkout",
      "GET /balance/:id",
    ]);
  });

  test("ranks exported functions by inbound calls, excluding route handlers (F15)", () => {
    const functions = [
      fn("a#one:1", "one"),
      fn("a#two:1", "two"),
      fn("a#hidden:1", "hidden", false),
    ];
    const inbound = new Map([
      ["a#one:1", 1],
      ["a#two:1", 5],
    ]);
    const { exports } = detectEntrypoints({
      functions,
      callSites: [],
      inbound,
    });
    expect(exports.map((e) => e.name)).toEqual(["two", "one"]);
  });
});
