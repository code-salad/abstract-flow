"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { openProject } from "../lib/api";
import { filterEntrypoints } from "../lib/entrypoint-search";
import type { ProjectInfo } from "../lib/types";

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-amber-400",
  PUT: "text-sky-400",
  DELETE: "text-red-400",
  PATCH: "text-violet-400",
};

export default function Home() {
  const [project, setProject] = useState<ProjectInfo | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const open = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      setBusy(true);
      setError(undefined);
      try {
        setProject(await openProject({ force }));
      } catch (err) {
        setError(String(err));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void open();
  }, [open]);

  const flowHref = ({ fnId }: { fnId: string }) =>
    project === undefined
      ? "#"
      : `/flow?project=${project.id}&root=${encodeURIComponent(project.root)}&path=${encodeURIComponent(fnId)}`;

  const entrypoints =
    project === undefined
      ? undefined
      : filterEntrypoints({ entrypoints: project.entrypoints, query });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-semibold text-2xl">Abstract Flow</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Explore the repo that started the server. Every node and edge is derived
        from the AST — nothing is generated.
      </p>

      {error !== undefined && (
        <p className="mt-8 text-red-400 text-sm">{error}</p>
      )}
      {project === undefined && error === undefined && (
        <p className="mt-8 text-sm text-zinc-500">Indexing this repository…</p>
      )}

      {project !== undefined && entrypoints !== undefined && (
        <section className="mt-10">
          <div className="flex items-center gap-3">
            <p className="grow text-xs text-zinc-500">
              {project.root} — {project.functionCount} functions indexed
            </p>
            <button
              type="button"
              onClick={() => void open({ force: true })}
              disabled={busy}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
            >
              {busy ? "Indexing…" : "Reindex"}
            </button>
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm text-zinc-400">
              Find a route or function
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, route, method, or source file"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-500"
            />
          </label>

          {entrypoints.routes.length > 0 && (
            <>
              <h2 className="mt-6 font-medium text-sm text-zinc-400">
                HTTP routes ({entrypoints.routes.length})
              </h2>
              <ul className="mt-2 divide-y divide-zinc-800 rounded-md border border-zinc-800">
                {entrypoints.routes.map((r) => (
                  <li key={r.functionId}>
                    <Link
                      href={flowHref({ fnId: r.functionId })}
                      className="flex items-baseline gap-3 px-4 py-2.5 text-sm hover:bg-zinc-900"
                    >
                      <span
                        className={`w-14 font-mono ${METHOD_COLOR[r.method] ?? ""}`}
                      >
                        {r.method}
                      </span>
                      <span className="font-mono">{r.path}</span>
                      <span className="grow" />
                      <span className="text-xs text-zinc-500">
                        {r.anchor.file}:{r.anchor.startLine}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="mt-6 font-medium text-sm text-zinc-400">
            Exported functions ({entrypoints.exports.length}, by inbound calls)
          </h2>
          {entrypoints.exports.length > 0 ? (
            <ul className="mt-2 divide-y divide-zinc-800 rounded-md border border-zinc-800">
              {entrypoints.exports.slice(0, 20).map((e) => (
                <li key={e.functionId}>
                  <Link
                    href={flowHref({ fnId: e.functionId })}
                    className="flex items-baseline gap-3 px-4 py-2.5 text-sm hover:bg-zinc-900"
                  >
                    <span className="font-mono">{e.name}</span>
                    <span className="grow" />
                    <span className="text-xs text-zinc-500">
                      {e.inboundCalls} inbound
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              No matching entry points.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
