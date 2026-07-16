# 6. Functional requirements

## 6.1 Indexing pipeline

- **F1.** Given a repo path, build a per-function index: AST → branch-level CFG per function, plus a project-wide call resolution table (call site → target function, or → candidate set when dynamic dispatch prevents unique resolution).
- **F2.** CFGs are computed lazily or cached per function; the full project graph is never materialized eagerly.
- **F3.** Incremental re-indexing on file change (watch mode) so the tool stays useful during active development.
- **F4.** Vendor/stdlib code (`node_modules`) is indexed for call *targets* but never auto-expanded; it renders as terminal "external" nodes.

## 6.2 Flow view

- **F5.** Branch-level CFG rendering: straight-line statements collapsed into single blocks; only decision points, loops, early returns, and calls-of-interest break blocks.
- **F6.** Visual conventions: happy path runs top-to-bottom on a spine; error/early exits branch sideways and are color-coded by outcome (error return, thrown exception, success). Branch conditions display as short labels derived from the actual condition expression or return statement.
- **F7.** Loops render with an explicit back-edge marker (not a layout ring).
- **F8.** Every block carries a source anchor (file, line range). Click → inline code peek; second action → open in editor (deep link to VS Code et al.).

## 6.3 Block labeling (deterministic, priority order)

- **F9.** Labels are derived, never generated, using the first available of: (1) a leading comment on the block, (2) the name of the dominant call inside the block, (3) the verbatim condition/return expression, truncated. The derivation rule used is inspectable per block ("label from: comment").
- This is a deliberate product bet: heuristic labels are readable and *auditable*; verbatim fallback is ugly but honest. We never trade correctness for prettiness.

## 6.4 Cross-function navigation

- **F10.** Call nodes on the control-flow spine are expandable. First level expands in-place (indented, with return-value edge back to caller); a "focus" action promotes the callee to the main view for deeper traversal. Breadcrumb shows the full call path and is copyable/sharable.
- **F11.** Dynamic dispatch: when a call site resolves to N candidates, expanding shows a picker listing all N implementations with their locations. No silent choice.
- **F12.** Recursion renders as a self-reference marker (↻); never auto-expands.
- **F13.** Call-noise filtering: only calls into first-party project code appear as expandable spine nodes by default. Utility calls (logging, formatting, stdlib) are demoted to fine print with a "show all calls" toggle. Filter rules: package boundary (first-party vs dependency) + user-configurable allow/deny globs.

## 6.5 Entry points

- **F14.** Framework detection surfaces a browsable entry-point list on first open: HTTP routes (method + path), exported public API, CLI commands, cron/queue handlers — depending on detected framework.
- **F15.** Fallback for unrecognized projects: exported functions ranked by inbound call count.

## 6.6 Sharing (v1-lite)

- **F16.** Export current flow view as SVG/PNG and as a permalink encoding repo ref + entry point + expansion state (for teams: paste a trace into a PR review).
