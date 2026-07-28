---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Delegate research to the project `researcher`; do not silently research in the parent when the required stack is unavailable.

## Contract

1. Resolve the research question and destination before launching. Match an existing repository convention; otherwise use `docs/research/<descriptive-slug>.md`. Convert the destination to an absolute path so `pi-subagents` writes the requested deliverable there rather than its relative-output artifact directory.
2. For this multi-step flow, create a short `todo` list and keep one primary item `in_progress`. If `todo` is unavailable, maintain a text checklist and report the degradation.
3. Capture the worktree status and diff. The researcher is read-only; the only allowed worktree mutation is the declared destination, while `.pi-subagents/` is runtime-owned.
4. Confirm `subagent` is available, then launch in the background with the equivalent of:

   ```json
   {
     "agent": "researcher",
     "task": "Research the question below and return the complete cited Markdown artifact. Use primary sources. Use Context7 for third-party library/API facts, then official web sources as fallback. Every web_search call must set workflow to none. Question: <question>",
     "context": "fresh",
     "agentScope": "project",
     "timeoutMs": 1200000,
     "async": true,
     "output": "<absolute-destination>",
     "outputMode": "file-only"
   }
   ```

   Do not set `model`; project settings own it. Continue only independent parent work while the child runs. When this request must return the result, use `subagent_wait` for that run rather than polling.
5. The researcher must split the question into 2-4 useful angles. Every `web_search` call uses `workflow: "none"`; fetch only promising sources. Prefer official documentation, source code, specifications, first-party APIs, and direct evidence.
6. When a claim depends on a third-party library/framework/API, call `resolve-library-id` and then `query-docs`. If Context7 is unavailable, rate-limited, has no matching library, or lacks the needed fact, fall back to official-source web research and record the reason in `## Gaps` or `## Method`.
7. The artifact must contain a direct answer, findings with inline links, `## Sources`, and any unresolved gaps. Distinguish sourced facts from inference.
8. After the child settles, verify the destination exists, is non-empty, contains source URLs/citations, and supports each material conclusion. A completed child without a valid file is failure. Retry once with the same model and a corrective prompt when output persistence or artifact validation fails. Retry a classified transient/infrastructure failure once; do not retry an ordinary research failure blindly.
9. Compare the worktree against the pre-run snapshot, allowing only the destination and `.pi-subagents/`. Any other mutation fails closed: stop, preserve the evidence, and do not restore files automatically.
10. Complete the todo and report the destination, source quality, fallbacks, and gaps.

If `subagent`, required web tools, or output persistence is unavailable after the allowed retry, stop with a diagnostic and remediation; do not claim research completion.
