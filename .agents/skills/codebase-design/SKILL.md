---
name: codebase-design
description: Shared vocabulary for designing deep modules. Use to design or improve an interface, find deepening opportunities, place a seam, improve testability/AI navigation, or support another design skill.
---

# Codebase Design

Design **deep modules**: substantial behavior behind a small interface, placed at a clean seam and testable through that interface. Use this vocabulary consistently: **Module**, **Interface**, **Implementation**, **Depth**, **Seam**, **Adapter**, **Leverage**, and **Locality**.

## Core model

- A Module has one Interface: everything callers must know, including invariants, ordering, errors, configuration, and performance—not only a type signature.
- Depth is leverage delivered per unit of interface. A large implementation can be deep; padding never creates depth.
- A Seam is the location where behavior can vary without editing callers. An Adapter fills an actual seam.
- The interface is the test surface. If tests must reach past it, reconsider the module shape.
- One adapter is usually hypothetical; two adapters demonstrate a real variation. Avoid speculative seams.
- Apply the deletion test: if deleting the module redistributes complexity across callers, it earned locality; if complexity disappears, it was probably a middle man.

Prefer accepting dependencies over constructing them, returning results over hidden side effects, and reducing methods/parameters while hiding coherent complexity.

Read [DEEPENING.md](DEEPENING.md) for cluster deepening and [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md) for alternative-interface exploration.

## Design-it-twice orchestration

When the question benefits from genuinely different interface shapes, use parallel project subagents rather than one agent iterating on its first idea:

1. Create a short `todo` list for context, alternatives, comparison, and decision; use a text checklist only if unavailable.
2. Build compact local context with `scout` (`context: "fresh"`, `agentScope: "project"`, `timeoutMs: 600000`, `output: false`) and consume `details.results[0].artifactPaths.outputPath`. For third-party constraints, use `context-builder` the same way; it must query Context7 first and official web with `workflow: "none"` only as fallback.
3. Capture the worktree status/diff before the read-only batch. Launch 2-3 independent `delegate` tasks in one parallel call with fresh context, `agentScope: "project"`, `concurrency` equal to task count, `timeoutMs: 1200000`, and `output: false` per task. Consume each distinct runtime `artifactPaths.outputPath`. Do not override the model.
4. Give every task the same problem, callers, invariants, constraints, and context path, but assign a materially different design lens (for example minimum interface, domain-shaped interface, or data-oriented interface). Shell use is inspection-only. Require interface, seam, adapters, invariants/errors, migration impact, tests through the interface, tradeoffs, and rejected alternatives.
5. Validate all artifacts and compare the worktree snapshot, ignoring `.pi-subagents/` only. Any mutation fails closed and is never auto-restored.
6. The parent compares alternatives on depth/leverage, caller simplicity, locality, seam reality, testability, migration cost, and fit with existing architecture. Do not average them into an incoherent hybrid.
7. If a product or architecture choice remains, ask exactly one decision with `ask_user_question`, include a recommendation, and wait. Fall back to one chat question only if unavailable.
8. Record the chosen interface and rejected alternatives in the appropriate domain/ADR artifact. This skill designs; it does not launch a writer unless explicitly handed off to `/skill:implement`.

For a small design question where alternatives would add no value, reason directly from the core model without delegation.

Only retry a subagent once for a classified transient/infrastructure failure with the same model. Missing required orchestration or invalid output after one correction fails closed.
