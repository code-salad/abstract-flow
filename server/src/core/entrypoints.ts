import type {
  Entrypoints,
  NormFunction,
  RawCallSite,
  RouteEntry,
} from "./types";

// F14/F15: pure entry-point rules over provider-extracted facts.

const HTTP_METHOD = /\.(get|post|put|delete|patch|all|use)$/;

export function detectEntrypoints({
  functions,
  callSites,
  inbound,
}: {
  functions: NormFunction[];
  callSites: RawCallSite[];
  inbound: Map<string, number>;
}): Entrypoints {
  const routes: RouteEntry[] = [];
  for (const site of callSites) {
    const match = HTTP_METHOD.exec(site.calleeText);
    if (match === null || match[1] === undefined || match[1] === "use") {
      continue;
    }
    if (
      site.firstArgString === undefined ||
      site.handlerTargetId === undefined
    ) {
      continue;
    }
    routes.push({
      method: match[1].toUpperCase(),
      path: site.firstArgString,
      functionId: site.handlerTargetId,
      anchor: site.anchor,
    });
  }

  // Fallback ranking: exported functions by inbound call count (F15).
  const routeHandlers = new Set(routes.map((r) => r.functionId));
  const exports = functions
    .filter((fn) => fn.exported && !routeHandlers.has(fn.id))
    .map((fn) => ({
      functionId: fn.id,
      name: fn.name,
      inboundCalls: inbound.get(fn.id) ?? 0,
    }))
    .sort(
      (a, b) => b.inboundCalls - a.inboundCalls || a.name.localeCompare(b.name),
    );

  return { routes, exports };
}
