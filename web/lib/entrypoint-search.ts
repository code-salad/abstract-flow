import type { Entrypoints } from "./types";

export function filterEntrypoints({
  entrypoints,
  query,
}: {
  entrypoints: Entrypoints;
  query: string;
}): Entrypoints {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return entrypoints;
  }

  return {
    routes: entrypoints.routes.filter(({ anchor, method, path }) =>
      `${method} ${path} ${anchor.file}`.toLowerCase().includes(needle),
    ),
    exports: entrypoints.exports.filter(({ name }) =>
      name.toLowerCase().includes(needle),
    ),
  };
}
