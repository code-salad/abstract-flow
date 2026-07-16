# 2. Product principles

1. **Zero hallucination by construction.** Every node, edge, and label is derived deterministically from the AST and type information. If the tool shows an edge, that edge exists in the source. No generative model sits between the code and the visualization.
2. **The diagram is the index, not the destination.** Users see logic flow and branching without the code, but every element is one click from the actual source lines. We accelerate navigation to the right code; we don't replace reading it.
3. **Cold checkout to first insight in minutes.** Static analysis only for v1 — no build required, no test suite, no database server, no running app. Point at a repo, get flows.
4. **Honest about uncertainty.** Where static analysis genuinely can't resolve something (dynamic dispatch, reflection), we show the ambiguity explicitly ("3 possible implementations") rather than guessing.
