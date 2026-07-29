# Agent Workflows

Bundle này cung cấp workflow phát triển project-local cho Pi. Toàn bộ resource dùng chung nằm trong `.pi/`; quy ước kiến trúc, test, release và domain thuộc `.pi/docs/PROJECT-RULES.md`, `.pi/docs/CONTEXT.md` và package files của project đích.

## Khởi động

Pi load skill bằng cú pháp:

```text
/skill:<tên-skill> [tham số]
```

Ví dụ:

```text
/skill:implement #42
/skill:code-review main
/skill:teach TypeScript generics
```

Trust project rồi chạy `/reload` hoặc khởi động lại Pi sau khi copy bundle hay đổi package/config. Không dùng shorthand `/implement` hay `/to-spec`.

## Stack đã pin

| Package | Tool/resource |
| --- | --- |
| `pi-web-access@0.15.0` | `web_search`, `fetch_content`, `get_search_content` |
| `@juicesharp/rpiv-ask-user-question@2.1.0` | `ask_user_question` |
| `pi-subagents@0.37.2` | `subagent`, builtin agents, prompts |
| `@juicesharp/rpiv-todo@2.1.0` | `todo` |
| `@upstash/context7-pi@0.1.2` | `resolve-library-id`, `query-docs` |

Pi tự reconcile package vào `.pi/npm/`; không commit cache hoặc credential. Nếu chưa biết bắt đầu ở đâu, dùng `/skill:ask-matt`.

## Roles

Mọi call `subagent` phải dùng `agentScope: "project"`, không per-run model override và truyền `timeoutMs` theo bảng.

| Role | Model / thinking | Context | Timeout | Công dụng |
| --- | --- | --- | --- | --- |
| `scout` | DeepSeek Flash / mặc định | fresh | 10 phút | reconnaissance local, read-only |
| `researcher` | DeepSeek Flash / mặc định | fresh | 20 phút | primary-source web/Context7 |
| `planner` | Terra / high | fork | 20 phút | implementation plan, read-only |
| `worker` | Terra / high | fork | 30 phút | writer duy nhất |
| `reviewer` | Terra / high | fresh | 20 phút | Standards hoặc Spec review |
| `context-builder` | DeepSeek Flash / mặc định | fresh | 10 phút | context local + docs ngoài repo |
| `oracle` | Terra / high | fork | 20 phút | decision/root-cause advisory; tự chốt technical recommendation khi `oracleAutonomousDecisions: true` |
| `delegate` | Terra / high | fresh | 20 phút | bounded read-only analysis |

`advisor` và watchdog bị disable. `oracleAutonomousDecisions` là boolean top-level, mặc định `false`; khi `true`, policy yêu cầu oracle tự chọn một technical recommendation trong boundary thường, còn parent/runtime persist và validate decision record với `outputMode: "file-only"` tại `.pi-subagents/decisions/<stable-run-id-or-timestamp>.md`. Contract đầy đủ về single writer, mutation gate, artifact, retry, questionnaire, todo, Context7 và review nằm trong `.pi/docs/ORCHESTRATION.md`.

## Main flow: idea → ship

```text
/skill:grill-with-docs
  ├─ fact/doc/API cần kiểm chứng → /skill:research
  ├─ logic/UI cần kiểm chứng      → /skill:prototype
  └─ scope đã rõ
       ├─ nhỏ → /skill:implement → /skill:code-review
       └─ lớn → /skill:to-spec → /skill:to-tickets → /skill:implement
```

- `/skill:grill-with-docs`: làm rõ một ý tưởng trong codebase và lưu quyết định domain khi phù hợp.
- `/skill:grill-me`: làm rõ ý tưởng không cần codebase/documentation.
- `/skill:research <question>`: dùng `researcher`, nguồn primary, citation artifact runtime; Context7 trước cho third-party API.
- `/skill:prototype <question>`: tạo artifact thử nghiệm, giữ kết luận thay vì biến prototype thành production code.
- `/skill:implement <requirement|issue>`: một `worker`, TDD khi phù hợp, targeted checks, review Standards/Spec và final diff summary.
- `/skill:code-review <fixed-point>`: hai `reviewer` song song, báo cáo riêng Standards và Spec.
- `/skill:to-spec`: biến hội thoại thành spec; `/skill:to-tickets <spec|issue>` chia thành ticket. Mở context mới cho từng `/skill:implement #<ticket>`.

Không workflow nào tự commit.

## Primitives và workflow contracts

- `/skill:grilling`: hỏi một quyết định mỗi lần với khuyến nghị; quyết định vẫn thuộc người dùng.
- `/skill:research` dùng `researcher`; `/skill:prototype` và `/skill:implement` chỉ có một `worker` tại một thời điểm.
- `/skill:code-review` tách hai `reviewer` fresh-context: Standards và Spec; không gộp hoặc rerank hai kết quả.
- `/skill:context-builder` không là user workflow độc lập; parent dùng nó khi cần synthesis local + external docs trước planning.
- `/skill:planner`, `/skill:scout`, `/skill:oracle`, `/skill:delegate` là role `subagent`, không phải public skill command.
- Research artifact và report read-only nằm dưới `.pi-subagents/` do runtime quản lý. Deliverable trong repo chỉ được runtime persist theo path tuyệt đối đã khai báo và parent phải validate. Khi `oracleAutonomousDecisions: true`, parent phải launch `oracle` với file-only runtime output tuyệt đối dưới `.pi-subagents/decisions/<stable-run-id-or-timestamp>.md`, sau đó validate đầy đủ các heading decision record; oracle không tự write artifact.
- Với third-party API, `researcher` hoặc `context-builder` gọi `resolve-library-id` → `query-docs`; nếu thiếu coverage thì official-web fallback với `workflow: "none"`.
- Flow từ ba bước dùng `todo`; nếu tool không có, ghi text checklist. Câu hỏi tương tác dùng `ask_user_question`; nếu không có thì hỏi một câu trong chat.
- Trước mỗi batch read-only, parent capture status/diff; sau batch so sánh và fail closed khi có mutation ngoài runtime artifact/output đã khai báo.
- Retry một lần chỉ cho transient/infrastructure failure, cùng model; không retry task failure thông thường.

## Completion checklist

1. Xác nhận scope và project conventions trước khi gọi writer.
2. Chạy targeted checks trước full check khi project có cả hai.
3. Đọc đủ runtime artifact trước khi tin một child result.
4. Báo files changed, checks, review outcome và residual risk.
5. Giữ parent làm orchestrator; child không tự spawn workflow khác.
6. Không stage, commit hoặc push trừ khi user yêu cầu rõ.

## Other on-ramps

| Tình huống | Lệnh | Kết quả |
| --- | --- | --- |
| Issue/request bên ngoài | `/skill:triage [#issue]` | `needs-info`, `ready-for-agent`, `ready-for-human` hoặc `wontfix` |
| Bug khó, flaky, regression | `/skill:diagnosing-bugs <mô tả>` | repro → hypothesis → regression test → fix |
| Hành vi rõ cần red-green-refactor | `/skill:tdd <behavior>` | test-first implementation seam |
| Nỗ lực lớn, còn fog | `/skill:wayfinder <destination>` | map và decision tickets, rồi `/skill:to-spec`/`/skill:to-tickets` |
| Kiến trúc khó thay đổi | `/skill:improve-codebase-architecture` | friction report → `/skill:grill-with-docs` → spec/implement |
| Thiết kế module/interface | `/skill:codebase-design` | module, seam, adapter, depth |
| Làm rõ ubiquitous language/ADR | `/skill:domain-modeling` | domain vocabulary và decisions |
| Chuyển session | `/skill:handoff <mục đích>` | context handoff file |
| Merge/rebase conflict | `/skill:resolving-merge-conflicts` | resolve intent-preserving hunks, rồi checks |
| Học nhiều session | `/skill:teach <topic>` | learning workspace và tiến độ |
| Viết/chỉnh skill | `/skill:writing-great-skills <goal>` | skill authoring guidance |
| Setup issue/domain conventions | `/skill:setup-matt-pocock-skills` | `.pi/docs/agents/` configuration |

`/skill:wayfinder` chỉ quyết định route; không trực tiếp xây deliverable. `/skill:handoff` khác `/compact`: handoff chuyển session, compact giữ cùng conversation.

## Quick selector

| Need | Start with |
| --- | --- |
| Chọn workflow | `/skill:ask-matt` |
| Feature idea trong codebase | `/skill:grill-with-docs` |
| Feature idea ngoài codebase | `/skill:grill-me` |
| Requirement nhỏ, rõ | `/skill:implement` |
| Primary-source fact/API | `/skill:research` |
| Logic/UI experiment | `/skill:prototype` |
| PRD/spec hoặc tickets | `/skill:to-spec`, `/skill:to-tickets` |
| Review diff | `/skill:code-review` |
| Bug/performance regression | `/skill:diagnosing-bugs` |
| Architecture/domain | `/skill:improve-codebase-architecture`, `/skill:codebase-design`, `/skill:domain-modeling` |
| Large uncertain effort | `/skill:wayfinder` |
| Raw external issue | `/skill:triage` |
| Session change/conflict/learning | `/skill:handoff`, `/skill:resolving-merge-conflicts`, `/skill:teach` |

## Validation

Không chạy live model/network/TUI smoke trong CI. Trước handoff, chạy:

```bash
node .pi/scripts/check-skill-forks.mjs
# các targeted/full checks do project đích công bố
git diff --check
```

Giữ `.pi/npm/`, `.pi/sessions/` và root `.pi-subagents/` ignored; kiểm tra không có credential hoặc lockfile thay đổi ngoài chủ đích.
