import { describe, expect, test } from "bun:test";
import { cleanComment, deriveLabel, truncate } from "./labels";
import type { CallRef } from "./types";

const anchor = { file: "a.ts", startLine: 1, endLine: 1 };
const call = (name: string): CallRef => ({ name, external: false, anchor });

describe("deriveLabel (F9 priority chain)", () => {
  test("comment wins over everything", () => {
    const r = deriveLabel({
      comment: "validate the cart",
      calls: [call("findUser")],
      text: "const x = 1",
    });
    expect(r).toEqual({ label: "validate the cart", from: "comment" });
  });

  test("dominant call when no comment", () => {
    const r = deriveLabel({
      calls: [call("findUser"), call("chargeCard")],
      text: "const u = findUser()",
    });
    expect(r).toEqual({ label: "findUser()", from: "call" });
  });

  test("verbatim fallback, truncated", () => {
    const long = "x".repeat(100);
    const r = deriveLabel({ calls: [], text: long });
    expect(r.from).toBe("verbatim");
    expect(r.label.length).toBeLessThanOrEqual(60);
    expect(r.label.endsWith("…")).toBe(true);
  });

  test("empty comment falls through", () => {
    const r = deriveLabel({ comment: "  ", calls: [], text: "let y = 2" });
    expect(r.from).toBe("verbatim");
  });
});

describe("cleanComment", () => {
  test("strips line-comment markers", () => {
    expect(cleanComment({ raw: "// validate the cart" })).toBe(
      "validate the cart",
    );
  });
  test("strips block markers and takes first non-empty line", () => {
    expect(cleanComment({ raw: "/**\n * charge first\n */" })).toBe(
      "charge first",
    );
  });
});

describe("truncate", () => {
  test("collapses whitespace", () => {
    expect(truncate({ text: "a\n   b" })).toBe("a b");
  });
});
