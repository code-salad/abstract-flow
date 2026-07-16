import type { z } from "zod";
import {
  type FlowGraph,
  flowGraph,
  type ProjectInfo,
  projectInfo,
  type SourcePeek,
  sourcePeek,
} from "./types";

// Same-origin: /api/* is rewritten to the backend by next.config.ts.
const BASE = "/api/v1";

async function request<S extends z.ZodType>({
  path,
  schema,
  init,
}: {
  path: string;
  schema: S;
  init?: RequestInit;
}): Promise<z.infer<S>> {
  const res = await fetch(`${BASE}${path}`, init);
  const body: unknown = await res.json();
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String(body.error)
        : res.statusText;
    throw new Error(message);
  }
  return schema.parse(body);
}

export function openProject({ path }: { path: string }): Promise<ProjectInfo> {
  return request({
    path: "/projects",
    schema: projectInfo,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    },
  });
}

export function fetchFlow({
  projectId,
  fnId,
}: {
  projectId: string;
  fnId: string;
}): Promise<FlowGraph> {
  return request({
    path: `/projects/${projectId}/flows?fn=${encodeURIComponent(fnId)}`,
    schema: flowGraph,
  });
}

export function fetchSource({
  projectId,
  file,
  start,
  end,
}: {
  projectId: string;
  file: string;
  start: number;
  end: number;
}): Promise<SourcePeek> {
  return request({
    path: `/projects/${projectId}/source?file=${encodeURIComponent(file)}&start=${start}&end=${end}`,
    schema: sourcePeek,
  });
}
