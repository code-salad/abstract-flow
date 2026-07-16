import { Suspense } from "react";
import { FlowView } from "./flow-view";

// searchParams is a Promise in Next 16.
export default async function FlowPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; path?: string; root?: string }>;
}) {
  const { project, path, root } = await searchParams;
  if (project === undefined || path === undefined) {
    return (
      <main className="p-8 text-sm text-zinc-400">
        Missing project/path — open a repo first.
      </main>
    );
  }
  return (
    <Suspense>
      <FlowView projectId={project} fnPath={path} root={root ?? ""} />
    </Suspense>
  );
}
