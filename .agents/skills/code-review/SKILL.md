---
name: code-review
description: Review the changes since a fixed point along independent Standards and Spec axes. Runs both reviews in parallel project subagents and reports them side by side. Use for a branch, PR, WIP diff, or "review since X".
---

Review the diff between `HEAD` and a fixed point using two independent, read-only project reviewers. Do not edit code, apply fixes, or collapse the two axes into one ranking.

## 1. Establish the review target

Resolve the fixed point supplied by the user (commit, branch, tag, or merge-base). If none was supplied, ask exactly one question using `ask_user_question`, with likely refs as options and a recommendation; fall back to one chat question if the tool is unavailable.

Run once in the parent:

- `git rev-parse <fixed-point>`
- `git diff <fixed-point>...HEAD`
- `git log <fixed-point>..HEAD --oneline`

Fail before delegation if the ref is invalid or the diff is empty.

For this multi-step flow, create a short `todo` list; use a text checklist only if the tool is unavailable. Capture `git status --porcelain=v1 --untracked-files=all` and the current diff before the reviewer batch. Reviewer reports use the distinct runtime artifact paths returned for each child.

## 2. Identify evidence

Find the originating spec in this order:

1. issue/PR references in commit messages, using `docs/agents/issue-tracker.md`;
2. a path supplied by the user;
3. a matching file under `docs/`, `specs/`, or `.scratch/`;
4. one user question if the source remains ambiguous.

If the user confirms no spec exists, skip the Spec child and report that axis as `No spec available`.

Identify repository standards such as `AGENTS.md`, `CONTRIBUTING.md`, coding standards, architecture docs, and applicable ADRs. In addition, the Standards prompt must carry this smell baseline as judgement calls, never automatic violations: Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, and Refused Bequest. A documented repository standard overrides the baseline; skip issues already enforced mechanically by tooling.

## 3. Run independent reviewers

Confirm `subagent` is available. Launch one parallel call with `agentScope: "project"`, `context: "fresh"`, `concurrency: 2`, `timeoutMs: 1200000`, no model override, and `output: false` for each task. Read each complete report from its `details.results[].artifactPaths.outputPath`; do not assign reviewer output paths because reviewers retain `bash` for checks.

**Standards reviewer task:** include the fixed point, exact diff/log commands, standards files, and full smell baseline. Require evidence by file/hunk, distinguish documented violations from smell judgements, and state cleanly when there are no findings. Shell commands are inspection/check-only and must not mutate the worktree.

**Spec reviewer task:** include the fixed point, exact diff/log commands, and spec path or fetched contents. Require evidence for missing/partial requirements, incorrect behavior, and unrequested scope. Quote the requirement for every finding. Shell commands are inspection/check-only and must not mutate the worktree.

If there is no Spec task, run only Standards. Validate every required output artifact; a completed child without its report is failure. A classified transient/infrastructure failure may be retried once with the same configured model. Do not retry an ordinary review result.

Compare status and diff against the pre-batch snapshot, ignoring `.pi-subagents/` only. Any other mutation fails closed: stop and report the files; never restore them automatically.

## 4. Report without reranking

Present the reports under `## Standards` and `## Spec`, verbatim or lightly cleaned. Do not merge, deduplicate across axes, or choose an overall winner. End with one line giving the count and worst severity within each axis. Complete the todo.

If `subagent`, the locked model, or required output persistence is unavailable after the allowed retry, fail closed with diagnostics rather than reviewing in the parent.
