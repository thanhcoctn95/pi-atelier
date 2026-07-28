Use available agent skills proactively whenever a request matches their purpose; the user does not need to name a skill explicitly. Briefly state which skill you are using and why. Do not use Superpowers unless the user explicitly requests it.

## Project-local orchestration

This repository loads its development-agent stack only from `.pi/settings.json`. Do not modify `~/.pi/**`, do not persist credentials in the repository, and do not override the parent session's model. Project subagents are locked to `myapi/3party/gpt-5.6-sol`; a missing or unauthenticated model is a blocker, not a reason to fall back.

For every integrated flow, call `subagent` with `agentScope: "project"`. The package has no persistent `agentScope` setting, so omitting this field can admit user-global agents. Do not pass a per-run model override. Use these role contracts:

| Role | Context | Thinking | Timeout | Contract |
| --- | --- | --- | --- | --- |
| `scout` | fresh | medium | 10 min | read-only local reconnaissance |
| `researcher` | fresh | medium | 20 min | primary-source web/Context7 research |
| `planner` | fork | high | 20 min | implementation plan, no mutation |
| `worker` | fork | high | 30 min | the only code/file writer |
| `reviewer` | fresh | high | 20 min | independent review and checks |
| `context-builder` | fresh | high | 10 min | local context plus external docs when needed |
| `oracle` | fork | high | 20 min | decision consistency and diagnosis |
| `delegate` | fresh | medium | 20 min | bounded read-only delegated work |

### Invariants

- The parent orchestrates. Only one `worker` may write in a worktree at a time. The parent and every other role stay read-only except for runtime-owned output persistence and an explicitly requested deliverable path.
- Before each read-only subagent batch, capture `git status --porcelain=v1 --untracked-files=all` and the current diff. Compare them after the batch, ignoring `.pi-subagents/` and explicitly allowed output paths. If anything else changed, stop; do not restore, delete, or continue to a worker.
- Read-only agents retain `bash` for inspection and checks. In every task, state that shell commands must not mutate the worktree. This is detection, not a sandbox.
- Put intermediate context, plans, progress, and review files under `.pi-subagents/`. For read-only roles that retain `bash` (`scout`, `context-builder`, `reviewer`, `oracle`, `delegate`), pass `output: false` and consume the runtime-owned `details.results[].artifactPaths.outputPath`; do not give the child an output path that it may try to create through `bash`. Strict no-mutation roles such as `planner` and `researcher` may use an explicit `output` plus `outputMode: "file-only"`, allowing `pi-subagents` to persist their final response. Use an absolute repository path only for a user-requested deliverable. Treat a successful child status as insufficient until the required artifact is present and valid.
- Use `todo` for flows with at least three execution steps. Keep one primary item `in_progress` and complete items promptly. If unavailable, use a concise text checklist and report degraded mode.
- Use `ask_user_question` for one decision at a time with 2-4 concrete options and a recommendation. If unavailable or non-interactive, ask exactly one question in chat. Never infer an answer from cancellation.
- Only `researcher` and `context-builder` receive web and Context7 tools. For third-party libraries, call `resolve-library-id` then `query-docs`; if that fails or lacks coverage, use `web_search` with `workflow: "none"`, prefer official sources, and disclose the fallback.
- Parallelize independent read-only work. Never parallelize writers. Use `subagent_wait` only when a background result is required before the current flow can finish.
- Retry once, with the same configured model, only for a classified transient/infrastructure failure. Do not retry ordinary task failures blindly. Missing required orchestration tools fail closed; only Context7→official web, questionnaire→chat, and todo→text-checklist may degrade.
- Review implementation on separate Standards and Spec axes, in parallel fresh contexts, for at most two rounds. Remaining blockers after round two stop the flow.
- Do not create a commit unless the user explicitly asks. `/skill:implement` ends with reviewed changes, final checks, and a diff summary.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a single-context layout. See `docs/agents/domain.md`.

## npm publishing

Publish releases with `npm publish --access public`. The maintainer completes npm browser authentication manually in their terminal. Do not request, accept, or pass an OTP through the agent. After the maintainer reports success, verify the published version and `latest` dist-tag before pushing the release commit and Git tag.
