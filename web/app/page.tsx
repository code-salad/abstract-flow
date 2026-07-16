"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { openProject } from "@/lib/api";
import type { ProjectInfo } from "@/lib/types";

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-amber-400",
  PUT: "text-sky-400",
  DELETE: "text-red-400",
  PATCH: "text-violet-400",
};

export default function Home() {
  const [path, setPath] = useState("");
  const [project, setProject] = useState<ProjectInfo | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const open = useCallback(async ({ path }: { path?: string } = {}) => {
    setBusy(true);
    setError(undefined);
    try {
      setProject(await openProject({ path }));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void open();
  }, [open]);

  const flowHref = ({ fnId }: { fnId: string }) =>
    project === undefined
      ? "#"
      : `/flow?project=${project.id}&root=${encodeURIComponent(project.root)}&path=${encodeURIComponent(fnId)}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-semibold text-2xl">Codeflow</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Explore the repo that started the server, or open another one. Every
        node and edge is derived from the AST — nothing is generated.
      </p>

      <div className="mt-8 flex gap-2">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && path.trim() !== "") {
              void open({ path });
            }
          }}
          placeholder="/absolute/path/to/another/repo (optional)"
          className="grow rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="button"
          onClick={() => void open({ path })}
          disabled={busy || path.trim() === ""}
          className="rounded-md bg-zinc-200 px-4 py-2 font-medium text-sm text-zinc-900 disabled:opacity-40"
        >
          {busy ? "Indexing…" : "Open"}
        </button>
      </div>
      {error !== undefined && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}

      {project !== undefined && (
        <section className="mt-10">
          <p className="text-xs text-zinc-500">
            {project.root} — {project.functionCount} functions indexed
          </p>

          {project.entrypoints.routes.length > 0 && (
            <>
              <h2 className="mt-6 font-medium text-sm text-zinc-400">
                HTTP routes
              </h2>
              <ul className="mt-2 divide-y divide-zinc-800 rounded-md border border-zinc-800">
                {project.entrypoints.routes.map((r) => (
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
            Exported functions (by inbound calls)
          </h2>
          <ul className="mt-2 divide-y divide-zinc-800 rounded-md border border-zinc-800">
            {project.entrypoints.exports.slice(0, 20).map((e) => (
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
        </section>
      )}
    </main>
  );
}
