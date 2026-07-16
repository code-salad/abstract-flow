# 1. Problem

Developers dropped into an unfamiliar codebase have two bad options today:

1. **Read the code.** Accurate but slow. Understanding "what happens when a request hits this endpoint" means manually chasing calls across files, holding branches in your head, and losing the thread constantly. IDE tools (go-to-definition, call hierarchy) are accurate but fragmented — one hop at a time, no big picture.
2. **Ask an LLM to explain it.** Fast but fragile. LLM summaries of code hallucinate: they invent functions, miss branches, describe flows that don't exist, and degrade on large codebases where relevant context doesn't fit in the window. A developer can't tell a correct explanation from a confident wrong one without reading the code anyway — defeating the purpose.

The gap: there is no tool that gives a **fast, verifiably correct, visual answer** to the question *"what is the logic flow here?"* Sourcetrail (discontinued 2021) and CodeSee (shut down) proved demand exists and left the space empty.

## Who has this problem

- **New hires / contractors onboarding** onto an existing codebase (primary persona)
- **Reviewers** trying to understand the blast radius of a change
- **Maintainers** returning to code they wrote a year ago
- **Developers auditing AI-generated code** they didn't write themselves (a growing segment)
