---
name: wayfinder
description: Plan work too large for one agent session as a shared map of decision tickets, resolving them until the route to the destination is clear.
disable-model-invocation: true
---

Wayfinding finds a route through uncertainty; it does not charge at the destination. The canonical artifact is one issue-tracker map whose child issues resolve decisions, not implementation slices. Refer to every issue by linked title, never a bare id.

## Routing contract

Use the repository issue-tracker instructions. If they are unavailable, stop and run the setup workflow; do not invent tracker operations. For a flow with at least three steps, use `todo` and keep one primary item `in_progress`; fall back to a concise text checklist only when unavailable.

Ticket types route to the integrated flows:

- **Research (AFK):** `/skill:research`; a fresh project `researcher` produces a cited artifact. Independent research tickets may run in parallel.
- **Prototype (HITL):** `/skill:prototype`; a planner and exactly one worker create an explicit throwaway artifact for human reaction.
- **Grilling (HITL):** `/skill:grilling` plus `/skill:domain-modeling`; one recommended decision at a time through `ask_user_question`.
- **Task (AFK/HITL):** bounded prerequisite work only. Use a project `delegate` for read-only AFK inspection; route mutation to a single `worker` only when the map Notes explicitly permit execution.

Every direct subagent call uses `agentScope: "project"`, no model override, the role's context/timeout, and the read-only mutation gate from `AGENTS.md`. Roles with `bash` use `output: false` and their returned runtime `artifactPaths.outputPath`; strict no-mutation roles may use package-persisted file-only output for a declared deliverable. Missing required orchestration fails closed. Retry once only for a classified transient/infrastructure failure with the same model.

## Map structure

The map issue, labelled `wayfinder:map`, contains:

```markdown
## Destination
<the spec, decision, or bounded change this effort is finding a route to>

## Notes
<domain, required skills, standing preferences, and any explicit execution exception>

## Decisions so far
- [<closed ticket title>](link) — <one-line gist>

## Not yet specified
<in-scope fog that cannot yet be phrased as a precise question>

## Out of scope
<work beyond the destination>
```

Open tickets are child issues, discovered by tracker query rather than copied into the map. Each has one precise `## Question`, one `wayfinder:<type>` label, and is sized for one session. Claim a ticket by assignment before work. Use the tracker's native blocking relationship; the frontier is open, unblocked, unclaimed children.

Fog is in scope but not yet precise enough to ticket. If the question can be stated precisely now, make a ticket even if blocked. Out-of-scope work never graduates; close a mis-scoped ticket and link its gist under `Out of scope`, not `Decisions so far`.

## Chart the map

1. Use grilling and domain modeling to name the destination first.
2. Grill breadth-first to expose the first precise decisions and the fog. If the whole route is already clear and fits one session, stop and ask how the user wants to proceed; do not create a ceremonial map.
3. Create the map, then create currently precise child tickets.
4. Wire blocking relationships in a second pass after issue ids exist.
5. Launch independent Research tickets through `/skill:research` in parallel when useful. Each must satisfy its artifact/citation contract. Do not hand-resolve HITL tickets in the charting session.
6. Stop after charting. Do not start implementation.

## Work through the map

Resolve at most one non-research ticket per session:

1. Load the low-resolution map.
2. Use the user-named ticket or choose the first frontier ticket. Claim it before work.
3. Route it by ticket type. A HITL ticket cannot be answered by an agent impersonating the user.
4. Record the answer as a resolution comment, close the ticket, and append one linked gist to `Decisions so far`.
5. Create then wire newly precise tickets; remove graduated fog from `Not yet specified`. Close and record newly exposed out-of-scope tickets appropriately.
6. When no decisions or fog remain, hand the route to `/skill:to-spec` or the next explicit planning flow. Do not jump directly from a large map to implementation.

Wayfinder does not write product code by default, does not auto-commit, and does not enable a project-wide reviewer/watchdog.
