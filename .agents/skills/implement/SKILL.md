---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets. Route file changes through exactly one project `worker` via `subagent`, following `AGENTS.md`.

Use `/skill:tdd` where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use `/skill:code-review` to review the work.

Do not commit automatically; commit only when the user explicitly requests it.
