---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken, throwing, failing, flaky, or slow.
---

# Diagnosing Bugs

Build a tight, red-capable feedback loop before diagnosing. The parent orchestrates; read-only agents investigate and exactly one `worker` makes all test/code edits.

For work with at least three steps, create a `todo` list and keep one primary item `in_progress`; use a text checklist only if `todo` is unavailable. Read `CONTEXT.md` and relevant ADRs first. Every subagent call uses `agentScope: "project"`, never overrides the model, and follows the read-only mutation gate from `AGENTS.md`.

## Phase 1 — Build the feedback loop

Use one `scout` with fresh context, `timeoutMs: 600000`, and `output: false` to map the failing path, existing tests/harnesses, likely seams, and the fastest exact reproduction command. Read its complete report from `details.results[0].artifactPaths.outputPath`. Its shell use is inspection-only. Validate the runtime artifact and compare the worktree snapshot before continuing.

The parent then establishes one command that has already been run and is:

- **red-capable:** asserts the user's exact symptom;
- **deterministic:** or has a pinned, high reproduction rate for a flake;
- **fast:** seconds rather than minutes where practical;
- **agent-runnable:** unattended, except the provided HITL loop template.

Try, in order: an existing/failing test, HTTP or CLI script, headless-browser script, captured-trace replay, throwaway harness, property/fuzz loop, bisect/differential harness, then `scripts/hitl-loop.template.sh` as the last resort. Tighten speed and signal. If no loop can be built, stop, list what was tried, and ask for the exact missing environment or artifact. Do not hypothesize without a red-capable loop.

## Phase 2 — Reproduce and minimise

Run the loop, confirm it reproduces the reported symptom, and remove inputs/config/steps one at a time until every remaining element is load-bearing. Preserve the original command for final verification.

## Phase 3 — Rank hypotheses

For a difficult or ambiguous root cause, launch `oracle` with fork context, `timeoutMs: 1200000`, and `output: false`. Supply the minimized reproduction, observations, relevant code context, and request 3-5 ranked falsifiable hypotheses. Read its complete report from the returned runtime artifact, validate it, and run the read-only mutation gate.

Each hypothesis must state a prediction: if X is causal, changing or observing Y should change Z. Show the ranked list to the user. This is a progress checkpoint, not permission to let the investigation drift; proceed with the approved ranking unless the user changes it.

## Phase 4 — Probe one variable at a time

Use debugger/REPL inspection first, then narrowly tagged logs such as `[DEBUG-a4f2]`; never log everything. Every probe maps to one prediction. For performance regressions, establish a measurement baseline and use profiling/query plans/bisection rather than broad logs.

If temporary source mutation is required for instrumentation or a new harness, delegate it to the single `worker`; the parent and read-only roles must not write.

## Phase 5 — Regression test and fix

Launch exactly one `worker` with fork context and `timeoutMs: 1800000`. Give it the approved hypothesis, minimized and original repro commands, relevant artifacts, and instruction to:

1. write a regression test before the fix at a seam that exercises the real bug pattern;
2. watch it fail;
3. apply the smallest fix;
4. watch the regression test pass;
5. re-run the original feedback loop;
6. escalate any new product/architecture decision with `contact_supervisor`.

If no correct test seam exists, that is a finding; do not add a shallow false-confidence test. The worker still owns any necessary code change.

## Phase 6 — Review, cleanup, and finish

Run the same two-axis fresh-context reviewer batch used by `/skill:implement`: Standards and Spec/correct-symptom review in parallel, `timeoutMs: 1200000`, `output: false` per reviewer, and distinct runtime artifacts, for at most two review rounds. Route valid fixes back to the same worker. Any read-only mutation fails closed.

Before completion, verify:

- original repro is green;
- regression test passes, or the missing seam is documented;
- all uniquely tagged debug instrumentation is gone;
- throwaway artifacts are removed or clearly isolated;
- targeted checks and the repository full check pass;
- the confirmed root cause and evidence are stated.

Do not commit. If architecture prevented a faithful regression test, recommend `/skill:improve-codebase-architecture` only after the bug is fixed.

Retry a subagent once only for a classified transient/infrastructure failure with the same model. Missing required orchestration, invalid artifacts after one correction, unauthorized read-only mutation, or blockers remaining after review round two fail closed.
