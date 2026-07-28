---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
---

Apply `/skill:grilling` together with `/skill:domain-modeling`.

Use `ask_user_question` for exactly one decision per call, include a recommendation, and wait before following dependent branches. Fall back to one chat question only when the tool is unavailable or non-interactive. Look up repository facts instead of asking the user.

Maintain the domain vocabulary, decisions, constraints, rejected alternatives, and open questions using the repository's documented domain layout. Documentation may capture decisions during the interview, but do not implement product code or launch a writer. Before any implementation handoff, present the shared-understanding summary and obtain explicit confirmation.
