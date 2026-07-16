import type { CallRef, LabelSource } from "./types";

const MAX_LABEL = 60;

export function truncate({ text }: { text: string }): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= MAX_LABEL ? flat : `${flat.slice(0, MAX_LABEL - 1)}…`;
}

// F9: derived, never generated. Priority: leading comment → dominant call → verbatim.
export function deriveLabel({
  comment,
  calls,
  text,
}: {
  comment?: string;
  calls: CallRef[];
  text: string;
}): { label: string; from: LabelSource } {
  if (comment !== undefined && comment.trim() !== "") {
    return { label: truncate({ text: comment }), from: "comment" };
  }
  const dominant = calls[0];
  if (dominant !== undefined) {
    return { label: truncate({ text: `${dominant.name}()` }), from: "call" };
  }
  return { label: truncate({ text }), from: "verbatim" };
}

// Strip comment markers so labels read as prose. First line only.
export function cleanComment({ raw }: { raw: string }): string {
  const first = raw
    .split("\n")
    .map((line) => line.replace(/^\s*(\/\/|\/\*+|\*+\/?)\s?/, "").trim())
    .find((line) => line !== "");
  return first ?? "";
}
