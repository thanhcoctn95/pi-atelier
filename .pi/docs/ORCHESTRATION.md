# Portable Pi workflow policy

This policy is injected with `.pi/docs/PROJECT-RULES.md` by `.pi/extensions/workflow-policy.ts` for trusted projects that copy this bundle. It is generic: target-specific architecture, checks, release rules, protected files, and domain conventions belong in `PROJECT-RULES.md` and package files.

## Project-local orchestration

Use only the project-local stack declared in `.pi/settings.json`. Do not modify `~/.pi/**`, persist credentials in the repository, or override the parent session model. `planner`, `worker`, `reviewer`, `oracle`, and `delegate` use `myapi/3party/gpt-5.6-terra` with high thinking; `scout`, `researcher`, and `context-builder` use `myapi/3party/deepseek-v4-flash` without a thinking override. A missing or unauthenticated model is a blocker, not a reason to fall back.

Every integrated `subagent` call must set `agentScope: "project"`, must not set a per-run model override, and must pass the role timeout explicitly because agent overrides cannot persist run timeouts.

| Role | Context | Thinking | Timeout | Contract |
| --- | --- | --- | --- | --- |
| `scout` | fresh | model default | 10 min | read-only local reconnaissance |
| `researcher` | fresh | model default | 20 min | primary-source web/Context7 research |
| `planner` | fork | high | 20 min | implementation plan, no mutation |
| `worker` | fork | high | 30 min | the only code/file writer |
| `reviewer` | fresh | high | 20 min | independent review and checks |
| `context-builder` | fresh | model default | 10 min | local context plus external docs when needed |
| `oracle` | fork | high | 20 min | decision consistency and diagnosis; decisive technical recommendation when `oracleAutonomousDecisions` is enabled |
| `delegate` | fresh | high | 20 min | bounded read-only delegated work |

## Invariants

- The parent orchestrates. Only one `worker` may write in a worktree at a time. The parent and every other role stay read-only except for runtime-owned output persistence and an explicitly requested deliverable path.
- Before each read-only subagent batch, capture `git status --porcelain=v1 --untracked-files=all` and the current diff. Compare them after the batch, ignoring `.pi-subagents/` and explicitly allowed output paths. If anything else changed, stop; do not restore, delete, or continue to a worker.
- Read-only agents retain `bash` for inspection and checks. In every task, state that shell commands must not mutate the worktree. This is detection, not a sandbox.
- Put intermediate context, plans, progress, and review files under `.pi-subagents/`. For read-only roles with `bash` (`scout`, `context-builder`, `reviewer`, `oracle`, `delegate`), pass `output: false` and consume the runtime artifact from `details.results[].artifactPaths.outputPath`; do not assign a child-writable output path. **Narrow exception:** when `oracleAutonomousDecisions` is `true`, launch `oracle` with an absolute runtime-owned `output` at `.pi-subagents/decisions/<stable-run-id-or-timestamp>.md` and `outputMode: "file-only"` so its decision record is reviewable. This does not give oracle direct write authority. Strict no-mutation roles such as `planner` and `researcher` may use an explicit absolute `output` plus `outputMode: "file-only"`, allowing the runtime to persist the response. Treat a successful child status as insufficient until required artifacts exist and are valid.
- `oracleAutonomousDecisions` is an optional top-level boolean, default `false`. When `true`, the project-local workflow policy instructs an `oracle` to make one decisive technical recommendation for ordinary open technical judgments rather than ask the parent. It must still escalate irreconcilable inherited requirements and product, security, legal, destructive, or irreversible decisions. The oracle remains read-only and cannot launch implementation.
- In autonomous mode, the parent must use a runtime-owned oracle result with `outputMode: "file-only"` at an absolute path under `.pi-subagents/decisions/<stable-run-id-or-timestamp>.md`; the oracle must not write it. Validate the artifact is nonempty and contains: Options considered, Selected decision, Rationale / evidence, Trade-offs, Assumptions, Confidence, Rejected alternatives, and Review / reversal triggers. The extension cannot infer a subagent run id or persist a child result itself, so parent orchestration must supply and validate this path.
- Use `todo` for flows with at least three execution steps. Keep one primary item `in_progress` and complete it promptly. If unavailable, use a concise text checklist and report degraded mode.
- Use `ask_user_question` for one decision at a time with 2-4 concrete options and a recommendation. If unavailable or non-interactive, ask exactly one question in chat. Never infer an answer from cancellation.
- Only `researcher` and `context-builder` receive web and Context7 tools. For third-party libraries, call `resolve-library-id` then `query-docs`; if that fails or lacks coverage, use `web_search` with `workflow: "none"`, prefer official sources, and disclose the fallback.
- Parallelize independent read-only work. Never parallelize writers. Use `subagent_wait` only when a background result is required before the flow can finish.
- Retry once, with the same configured model, only for a classified transient/infrastructure failure. Do not retry ordinary task failures blindly. Missing required orchestration tools fail closed; only Context7 → official web, questionnaire → chat, and todo → checklist may degrade.
- Review implementation on separate Standards and Spec axes in parallel fresh contexts for at most two rounds. Remaining blockers after round two stop the flow.
- Do not create a commit unless the user explicitly asks. `/skill:implement` ends with reviewed changes, target-project checks, and a diff summary.

Before completion, discover the target repository's documented checks and run the relevant targeted checks plus its full check command when available. Do not assume npm, pnpm, CI, issue-tracker, release, publishing, or domain-documentation conventions.
