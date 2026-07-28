---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

Apply the `/skill:grilling` interaction contract without creating domain documentation.

Use `ask_user_question` for exactly one decision per call, always include a recommendation, and wait for the answer before continuing. Fall back to one chat question only when the tool is unavailable or non-interactive. Do not implement anything until the user confirms the final shared-understanding summary.
