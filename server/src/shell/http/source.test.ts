import { expect, test } from "bun:test";
import { tokenizeSource } from "./source";

test("tokenizes TypeScript and TSX source without losing text", () => {
  const text = `const total: number = 42;
// note
return <Box title="ok" />;`;
  const lines = tokenizeSource({ file: "example.tsx", text });
  const tokens = lines.flat();

  expect(
    lines.map((line) => line.map((token) => token.text).join("")).join("\n"),
  ).toBe(text);
  expect(tokens).toEqual(
    expect.arrayContaining([
      { text: "const", kind: "keyword" },
      { text: "42", kind: "number" },
      { text: "// note", kind: "comment" },
      { text: '"ok"', kind: "string" },
    ]),
  );
});
