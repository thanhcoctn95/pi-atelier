# Portable Pi workflows

This directory is a self-contained project-local Pi workflow bundle. Its `.gitignore` ships with the bundle and ignores only the regenerable `.pi/npm/` package cache and optional `.pi/sessions/` data. Install it into another project with `rsync`, which excludes those runtime directories even when the source bundle has already been used:

```bash
mkdir -p /absolute/target/.pi
rsync -a --delete --exclude npm/ --exclude sessions/ \
  /absolute/source/.pi/ /absolute/target/.pi/
```

`npm/` is Pi's project-local runtime package cache. `.pi-subagents/` is also runtime-only, but it lives at the target repository root rather than inside `.pi/`, so the target root `.gitignore` must ignore `.pi-subagents/`. This command does not copy that directory. Plain `cp -R` from a working source is not recommended because it can include ignored `.pi/npm/` cache; use the `rsync` command above or a clean exported bundle. If the target already has `.pi/`, review or merge its existing `settings.json` and resources deliberately before using `--delete`; back it up rather than overwriting it blindly.

From the target repository root, trust the project, start Pi, then run:

```text
/reload
/subagents-doctor
/subagents-models
```

The host must have provider access to `myapi/3party/gpt-5.6-terra` and `myapi/3party/deepseek-v4-flash`. Do not copy or commit `.pi/npm/`, `.pi/sessions/`, or root `.pi-subagents/`; Pi recreates runtime directories after trust/reload. Confirm the target root `.gitignore` ignores `.pi-subagents/` before starting a workflow.

The target root `AGENTS.md` remains optional and project-specific. Keep its architecture, checks, release rules, protected paths, and domain conventions there. The reusable orchestration policy is injected from `.pi/docs/ORCHESTRATION.md` by `.pi/extensions/workflow-policy.ts`.

The bundle validates all 22 complete skill trees, not only each `SKILL.md`: every portable regular file except `.DS_Store` is included in a deterministic tree hash. `.DS_Store` is intentionally excluded as non-portable OS metadata; empty directories and symlinks are not bundle integrity inputs. OpenAI harness metadata (`agents/openai.yaml`) is intentionally excluded because this bundle targets Pi; Pi discovers skill metadata from `SKILL.md`.

Validate the portable bundle and target ignores with:

```bash
node .pi/scripts/check-skill-forks.mjs
git check-ignore -v .pi/npm/example .pi-subagents/example
```

Then run the target project's own documented checks.
