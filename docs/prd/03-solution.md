# 3. Solution overview

A tool that generates **navigable, branch-level control flow graphs (CFGs)** from source code:

- Each function is rendered as a compact flow: straight-line code collapsed into labeled blocks, decision points shown as branches, happy path on a vertical spine, error exits branching sideways.
- Cross-function calls are marked as expandable nodes. Clicking one splices the callee's flow in-place (indented, with return edge), or promotes it to the main view for deep traces. A breadcrumb records the full call path — which is itself the trace the developer wanted.
- Clicking any block opens the exact source lines it represents.
- Users start from an **entry point** (an exported function, an HTTP route, a CLI command), not from a whole-codebase graph. The "hairball" full-graph view is explicitly a non-goal.
