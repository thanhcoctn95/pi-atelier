---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the user-approved work through project subagents. The parent orchestrates and runs the final gate; exactly one `worker` owns all product-code and test edits. Never commit automatically.

## Preconditions

- Read the request, referenced spec/tickets, `CONTEXT.md`, and relevant ADRs.
- If a product, architecture, or scope decision is unresolved, use the grilling contract before implementation.
- Create a concise `todo` list for context, plan, implementation, review, and final validation. Keep one primary item `in_progress`; fall back to a text checklist only if `todo` is unavailable.
- Confirm `subagent` and required project agents are available. Every call must set `agentScope: "project"` and must not set `model`.
- Capture `git status --porcelain=v1 --untracked-files=all` and the current diff before every read-only batch. Ignore `.pi-subagents/` only. A read-only role that changes anything else stops the flow; never auto-restore it.
- Allocate a unique `.pi-subagents/workflows/<run>/` directory for strict no-mutation outputs such as `plan.md`. For roles with `bash`, use the runtime artifact paths returned by `subagent` instead of assigning a child-writable output path.

## 1. Build context

Choose `scout` for local reconnaissance or `context-builder` when requirements, linked material, or third-party APIs need synthesis. Launch it with fresh context, `output: false`, and the role timeout (`scout`: 600000 ms; `context-builder`: 600000 ms). Read and validate the complete report from `details.results[0].artifactPaths.outputPath`; this file is written by the runtime under `.pi-subagents/`, not by the child.

The task must forbid shell mutation. If third-party documentation is needed, only `context-builder` may call `resolve-library-id` → `query-docs`, with official web fallback and `web_search.workflow: "none"`. Validate the runtime context artifact, then run the read-only mutation gate.

## 2. Plan

Launch `planner` with `context: "fork"`, `agentScope: "project"`, `timeoutMs: 1200000`, and `outputMode: "file-only"` to an absolute `plan.md` under the run directory. Give it the approved request/spec and context artifact path. Require exact files, ordered edits, TDD seams where appropriate, validation commands, risks, and explicit non-goals. Validate the plan artifact and run the read-only mutation gate.

If the plan introduces a new decision, stop and ask the user one question; do not let the worker decide it.

## 3. Implement with one writer

Launch one `worker` with `context: "fork"`, `agentScope: "project"`, and `timeoutMs: 1800000`. Give it the approved request, context path, plan path, baseline worktree state, and the instruction that it is the sole writer. It must:

- use TDD at pre-agreed seams where practical;
- run targeted typechecks/tests regularly;
- make the smallest coherent change;
- escalate an unapproved decision with `contact_supervisor` instead of guessing;
- report changed files and validation.

Never launch a second worker concurrently. The parent does not patch around the worker.

## 4. Review on two independent axes

After implementation, launch one parallel `subagent` call with two fresh-context `reviewer` tasks, `agentScope: "project"`, `concurrency: 2`, `timeoutMs: 1200000`, and `output: false` on each task. Read the two distinct reports from each result's `artifactPaths.outputPath`:

- **Standards:** inspect the actual diff, repository standards, architecture, tests, and applicable smell baseline. Report evidence-backed blockers/concerns only.
- **Spec:** compare the actual diff to the user request/spec/ticket. Report missing, partial, incorrect, or unrequested behavior with citations to the requirement.

Both tasks are read-only and may use `bash` only for inspection/checks. Validate both runtime artifacts and run the mutation gate. Keep the axes separate when synthesizing findings.

Send every valid fix-worthy finding to the same `worker`, never edit in the parent. Run at most two parallel review rounds total. Round 1 may be followed by worker fixes and round 2. If round 2 still has a blocker, stop and report it. If round 2 has only bounded non-blocking fixes, the worker may apply them once and the parent must include them in final checks; do not start a third review round.

## 5. Final gate and handoff

The parent runs the repository's targeted checks and then its full check command once (`npm run check` here). If a post-review fix is needed and no safe review round remains, stop rather than claiming completion.

Compare the final worktree with the starting state, complete the todo, and report:

- files changed and behavior delivered;
- tests/checks and their results;
- Standards and Spec review outcomes by round;
- residual risks or blockers;
- the final diff status.

Do **not** call `git commit`. Commit only in a separate user-requested action.

A classified transient/infrastructure subagent failure may be retried once with the same configured model. Missing orchestration tools, unavailable locked model, invalid required artifacts after one correction, or unauthorized read-only mutation fail closed.
