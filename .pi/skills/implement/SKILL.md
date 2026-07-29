---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets. Launch exactly one project `worker` through `subagent` with `agentScope: "project"`, fork context, and `timeoutMs: 1800000`; never override its model. Give it the approved scope, acceptance criteria, relevant tests, and explicit non-goals.

Use `/skill:tdd` where possible, at pre-agreed seams.

Require the worker to run typechecking regularly, single test files regularly, and the full test suite once at the end. Validate its changed-files report and check results after completion.

Then use `/skill:code-review` for separate Standards and Spec review. Route valid findings back to the same worker; run at most two review/fix rounds and stop with remaining blockers. End with a final diff summary.

Do not commit automatically; commit only when the user explicitly requests it.
