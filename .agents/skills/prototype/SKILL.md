---
name: prototype
description: Build a throwaway prototype to answer a design question. Use to sanity-check a state model/logic or explore what a UI should look like.
---

# Prototype

A prototype is throwaway code that answers one explicit question. The parent orchestrates; one `worker` writes it; read-only agents plan and review it.

## Choose the branch

Determine the question from the request and surrounding code:

- **Does this logic/state model feel right?** Read [LOGIC.md](LOGIC.md). Build a small interactive terminal harness that exposes the full state after each action.
- **What should this look like?** Read [UI.md](UI.md). Build several materially different UI variants on one route, switchable by the repository's normal mechanism.

If genuinely ambiguous, ask one decision through `ask_user_question` with a recommendation; fall back to one chat question only when unavailable. If the user is unreachable, choose the branch best supported by the surrounding code and state the assumption.

## Orchestrated flow

1. Create a short `todo` list; use a text checklist only if unavailable. Capture the initial worktree status and diff.
2. Use `scout` with fresh context, `agentScope: "project"`, `timeoutMs: 600000`, and `output: false` to find the correct local route/module, run command, conventions, and deletion boundary. Read its complete report from `details.results[0].artifactPaths.outputPath`. Its shell use is inspection-only. Validate the runtime artifact and enforce the read-only mutation gate.
3. Use `planner` with fork context, `agentScope: "project"`, `timeoutMs: 1200000`, and file-only output to define the smallest artifact that can answer the question, the cases/variants to expose, one run command, and the observation/verdict format. A prototype plan must avoid production abstractions and persistence unless those are the question.
4. Launch exactly one `worker` with fork context, `agentScope: "project"`, and `timeoutMs: 1800000`. It is the sole writer. Require clear `PROTOTYPE` naming, no hidden persistence, minimal error handling, full relevant state visibility, one run command, and no conversion into production code. New product/architecture decisions must go through `contact_supervisor`.
5. Run a fresh-context `reviewer` with `agentScope: "project"`, `timeoutMs: 1200000`, and `output: false`; read its report from the returned runtime artifact. It checks only whether the artifact is runnable, visibly throwaway, safely isolated, and capable of answering the stated question. It must not request production polish. Shell commands are inspection/check-only. Enforce the mutation gate.
6. Have the user react to the running prototype. Capture the question, observed evidence, verdict, and rejected direction. If changes are needed, route them to the same worker; never start a second concurrent writer.
7. Preserve the validated decision, not prototype code, on the production branch. Follow the repository's throwaway-branch policy from the branch-specific guide; do not create a commit or branch unless the user explicitly asks.

Retry once only for a classified transient/infrastructure failure with the same model. Missing orchestration, unauthorized read-only mutation, or an artifact that cannot answer the question fails closed.
