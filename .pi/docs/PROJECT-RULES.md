Use available agent skills proactively whenever a request matches their purpose; the user does not need to name a skill explicitly. Briefly state which skill you are using and why. Do not use Superpowers unless the user explicitly requests it.

## Portable Pi workflow policy

This repository loads reusable project-local workflow policy from `.pi/docs/ORCHESTRATION.md` and project-specific rules from this `.pi/docs/PROJECT-RULES.md`, both injected by `.pi/extensions/workflow-policy.ts` after the project is trusted. Keep architecture, checks, release rules, and publishing instructions here; keep reusable portable policy in `ORCHESTRATION.md`. When this bundle is copied, adapt `PROJECT-RULES.md` to the target project rather than changing the portable policy.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues. See `.pi/docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `.pi/docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a single-context layout. See `.pi/docs/agents/domain.md`.

## npm publishing

Publish releases with `npm publish --access public`. The maintainer completes npm browser authentication manually in their terminal. Do not request, accept, or pass an OTP through the agent. After the maintainer reports success, verify the published version and `latest` dist-tag before pushing the release commit and Git tag.
