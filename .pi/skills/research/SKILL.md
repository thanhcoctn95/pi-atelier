---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Spin up a background project `researcher` through `subagent` with `agentScope: "project"`, fresh context, `timeoutMs: 1200000`, and `outputMode: "file-only"`. Resolve the default `output` to an absolute repository path such as `<absolute-repo>/.pi-subagents/workflows/<run>/research.md`; the runtime, not the researcher, persists the artifact. The parent validates that it exists, is nonempty, and cites its sources. If the user explicitly requests a deliverable path in the repo, the parent may instead pass that absolute path for runtime-owned persistence and validates it; the researcher never mutates the worktree.

Its job:

1. Investigate the question against **primary sources** — official docs, source code, specs, first-party APIs — not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write findings in one cited Markdown artifact.
3. Report the artifact path and findings to the parent.
