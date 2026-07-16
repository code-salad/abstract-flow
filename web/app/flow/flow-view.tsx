"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlowCanvas } from "../../components/flow-canvas";
import { fetchFlow, fetchSource } from "../../lib/api";
import type {
  FlowGraph,
  SourceAnchor,
  SourcePeek,
  SourceToken,
} from "../../lib/types";

// The breadcrumb IS the trace (F10): ?path=fn1,fn2,… — last one is in view.
// The URL is the permalink (F16): repo project + entry point + focus path.

const shortName = ({ fnId }: { fnId: string }) =>
  fnId.split("#")[1]?.split(":")[0] ?? fnId;

const TOKEN_STYLE: Record<SourceToken["kind"], string> = {
  plain: "text-zinc-200",
  keyword: "text-amber-400",
  string: "text-emerald-400",
  number: "text-orange-300",
  comment: "text-zinc-500 italic",
};

function SourceCode({ source }: { source: SourcePeek }) {
  let lineNumber = source.startLine;
  return (
    <pre className="overflow-x-auto p-3 font-mono text-xs leading-5">
      <code className="block">
        {source.lines.map((line) => {
          const currentLine = lineNumber;
          lineNumber += 1;
          let offset = 0;
          return (
            <span
              key={currentLine}
              className="grid min-w-max grid-cols-[4ch_1fr] gap-3"
            >
              <span
                aria-hidden="true"
                className="select-none text-right text-zinc-600"
              >
                {String(currentLine).padStart(4)}
              </span>
              <span>
                {line.map((token) => {
                  const currentOffset = offset;
                  offset += token.text.length;
                  return (
                    <span
                      key={currentOffset}
                      className={TOKEN_STYLE[token.kind]}
                    >
                      {token.text}
                    </span>
                  );
                })}
              </span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}

export function FlowView({
  projectId,
  fnPath,
  root,
}: {
  projectId: string;
  fnPath: string;
  root: string;
}) {
  const router = useRouter();
  const trail = fnPath.split(",");
  const current = trail[trail.length - 1] ?? fnPath;
  const [graph, setGraph] = useState<FlowGraph | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [peek, setPeek] = useState<
    { anchor: SourceAnchor; source?: SourcePeek } | undefined
  >();

  useEffect(() => {
    setGraph(undefined);
    setError(undefined);
    fetchFlow({ projectId, fnId: current })
      .then(setGraph)
      .catch((err) => setError(String(err)));
  }, [projectId, current]);

  const navigate = ({ nextTrail }: { nextTrail: string[] }) => {
    const qs = `project=${projectId}&root=${encodeURIComponent(root)}&path=${encodeURIComponent(nextTrail.join(","))}`;
    router.push(`/flow?${qs}`);
  };

  const onFocus = ({ fnId }: { fnId: string }) =>
    navigate({ nextTrail: [...trail, fnId] });

  const onPeek = async ({ anchor }: { anchor: SourceAnchor }) => {
    setPeek({ anchor });
    const source = await fetchSource({
      projectId,
      file: anchor.file,
      start: anchor.startLine,
      end: anchor.endLine,
    });
    setPeek({ anchor, source });
  };

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center gap-2 border-zinc-800 border-b px-4 py-2 text-sm">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300">
          ⌂
        </Link>
        {trail.map((fnId, i) => (
          <span key={fnId} className="flex items-center gap-2">
            {i > 0 && <span className="text-zinc-600">›</span>}
            {i === trail.length - 1 ? (
              <span className="font-medium">{shortName({ fnId })}</span>
            ) : (
              <button
                type="button"
                onClick={() => navigate({ nextTrail: trail.slice(0, i + 1) })}
                className="text-zinc-400 hover:text-zinc-200"
              >
                {shortName({ fnId })}
              </button>
            )}
          </span>
        ))}
        <span className="grow" />
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-900"
          title="copy permalink to this trace"
        >
          copy trace link
        </button>
      </header>

      <div className="flex grow overflow-hidden">
        <div className="grow overflow-auto p-8">
          {error !== undefined && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          {graph === undefined && error === undefined && (
            <p className="text-sm text-zinc-500">loading flow…</p>
          )}
          {graph !== undefined && (
            <FlowCanvas
              projectId={projectId}
              graph={graph}
              ancestors={trail.slice(0, -1)}
              onFocus={onFocus}
              onPeek={onPeek}
            />
          )}
        </div>

        {peek !== undefined && (
          <aside className="w-[420px] shrink-0 overflow-auto border-zinc-800 border-l bg-zinc-900/60">
            <div className="flex items-center gap-2 border-zinc-800 border-b px-3 py-2 text-xs">
              <span className="font-mono text-zinc-400">
                {peek.anchor.file}:{peek.anchor.startLine}–{peek.anchor.endLine}
              </span>
              <span className="grow" />
              {root !== "" && (
                <a
                  href={`vscode://file/${root}/${peek.anchor.file}:${peek.anchor.startLine}`}
                  className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800"
                >
                  open in editor
                </a>
              )}
              <button
                type="button"
                onClick={() => setPeek(undefined)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            {peek.source === undefined ? (
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-5">
                …
              </pre>
            ) : (
              <SourceCode source={peek.source} />
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
