---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until there is a shared understanding. Walk the decision tree breadth-first enough to expose dependencies, then resolve each decision one at a time. For every question, state the recommended answer and why.

## Interaction contract

Use `ask_user_question` when it is available and interactive. Each call must contain exactly one question, 2-4 concrete options, `multiSelect: false`, and a short header. Make the recommendation visible in the question or recommended option description. Wait for the answer before choosing the next branch; never batch dependent decisions.

If `ask_user_question` is unavailable, removed in a non-interactive host, or returns a UI error, ask exactly one question in chat with the same options and recommendation. If the user cancels or declines, do not infer an answer; keep that decision open.

Do not use `todo` for the interview itself.

If a fact can be found by inspecting the repository or available tools, look it up rather than asking. Decisions belong to the user. When an answer exposes a new dependency, resolve that dependency before moving downstream.

Keep a compact running record of decisions, constraints, open questions, and rejected alternatives. Do not implement, edit product files, launch a writer, or commit anything during grilling. When no material decisions remain, summarize the shared understanding and ask one final confirmation question. Act only after explicit confirmation.
