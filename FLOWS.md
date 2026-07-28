# Agent Workflows

Repo này cung cấp một bộ workflow phát triển phần mềm dựa trên Pi skills. Các workflow thuộc lớp hỗ trợ phát triển repo, độc lập với runtime của Pi Atelier.

## Cách gọi workflow trong Pi

Pi expose skill theo cú pháp:

```text
/skill:<tên-skill> [tham số]
```

Ví dụ:

```text
/skill:implement #42
/skill:code-review main
/skill:teach TypeScript generics
```

Không dùng `/implement` hay `/to-spec`; đó là tên rút gọn trong tài liệu nguồn của bộ skills. Trong Pi, lệnh đầy đủ tương ứng là `/skill:implement` và `/skill:to-spec`.

Skill commands và toàn bộ stack workflow được khai báo project-local trong `.pi/settings.json`; không cần và không được sửa `~/.pi/**`. Project phải được trust. Sau khi pull thay đổi package/config hoặc thêm skill, chạy `/reload` hoặc khởi động lại Pi.

Stack đã pin exact version:

| Package | Tools/resources chính |
| --- | --- |
| `pi-web-access@0.15.0` | `web_search`, `fetch_content`, `get_search_content` |
| `@juicesharp/rpiv-ask-user-question@2.1.0` | `ask_user_question` |
| `pi-subagents@0.37.2` | `subagent`, `subagent_wait`, `subagent_supervisor`, builtin agents, skills và prompts |
| `@juicesharp/rpiv-todo@2.1.0` | `todo` |
| `@upstash/context7-pi@0.1.2` | `resolve-library-id`, `query-docs`, skill và prompt Context7 |

Pi tự reconcile các package còn thiếu vào `.pi/npm/`; thư mục này là runtime dependency và bị ignore. Không lưu API key trong repo. Web access và Context7 chạy zero-config ở quota mặc định; credential tùy chọn chỉ được cấp qua môi trường/cấu hình cá nhân ngoài repo.

Nếu không biết nên bắt đầu ở đâu, dùng:

```text
/skill:ask-matt
```

## Hợp đồng orchestration

Mọi flow tích hợp gọi `subagent` với `agentScope: "project"`; `pi-subagents@0.37.2` không có setting persistent cho scope này. Parent session không bị khóa model. Tám role project dùng `myapi/3party/gpt-5.6-sol`; model khác bị `modelScope` từ chối và không có fallback.

| Role | Context | Thinking | Timeout | Chức năng |
| --- | --- | --- | --- | --- |
| `scout` | fresh | medium | 10 phút | local reconnaissance, read-only |
| `researcher` | fresh | medium | 20 phút | primary-source web + Context7, read-only |
| `planner` | fork | high | 20 phút | kế hoạch triển khai, read-only |
| `worker` | fork | high | 30 phút | writer duy nhất |
| `reviewer` | fresh | high | 20 phút | review/check độc lập, read-only |
| `context-builder` | fresh | high | 10 phút | context local + docs ngoài repo, read-only |
| `oracle` | fork | high | 20 phút | kiểm tra quyết định/root cause, read-only |
| `delegate` | fresh | medium | 20 phút | delegated task giới hạn, read-only |

`advisor` bị disable và watchdog project-wide tắt. Các batch read-only được chụp status/diff trước-sau; mutation ngoài `.pi-subagents/` hoặc output được khai báo làm flow fail closed và không tự restore. Chỉ một worker chạy tại một thời điểm. Lỗi transient được retry tối đa một lần với cùng model; task failure thông thường không retry mù.

Flow từ ba bước dùng `todo`, chỉ một bước chính `in_progress`. Grilling hỏi đúng một quyết định mỗi lần bằng `ask_user_question`. Context7 được gọi theo chuỗi `resolve-library-id` → `query-docs` khi phụ thuộc thư viện; fallback là `web_search` nguồn chính thống với `workflow: "none"`. Tool orchestration bắt buộc bị thiếu thì dừng, ngoại trừ ba fallback: Context7 → official web, questionnaire → chat, todo → checklist.

## Flow chính: idea → ship

Đây là con đường mặc định cho một ý tưởng hoặc tính năng mới.

```text
/skill:grill-with-docs
          │
          ├── cần đọc tài liệu/source ──→ /skill:research ─────┐
          │                                                    │
          ├── cần kiểm chứng bằng code ─→ /skill:prototype ────┤
          │                                                    │
          ▼                                                    │
     công việc đã rõ ◄──────────────────────────────────────────┘
          │
          ├── nhỏ, làm trong một session
          │      └──→ /skill:implement
          │                └──→ TDD → checks → code review
          │
          └── lớn, cần nhiều session
                 └──→ /skill:to-spec
                           └──→ /skill:to-tickets
                                      └──→ session mới + /skill:implement cho từng ticket
                                                   └──→ /skill:code-review
```

### 1. Làm rõ ý tưởng

```text
/skill:grill-with-docs
```

Agent phỏng vấn từng câu một, đưa ra khuyến nghị và ghi các kết luận domain vào `CONTEXT.md` hoặc ADR khi phù hợp. Giữ bước làm rõ, tạo spec và chia ticket trong cùng một context nếu có thể.

Nếu không làm việc trong codebase và không cần lưu tài liệu:

```text
/skill:grill-me
```

### 2. Giải quyết câu hỏi còn mở

Nếu cần thông tin từ tài liệu chính thức hoặc source code:

```text
/skill:research <câu hỏi>
```

Nếu cần một chương trình thử nghiệm để đánh giá logic, state model hoặc UI:

```text
/skill:prototype <câu hỏi cần kiểm chứng>
```

Prototype là code bỏ đi: giữ lại kết luận, không biến prototype thành production code.

### 3. Chọn nhánh triển khai

Với công việc nhỏ, đã rõ và có thể hoàn tất trong một session:

```text
/skill:implement <yêu cầu hoặc issue>
```

Với công việc lớn, cần nhiều session:

```text
/skill:to-spec
/skill:to-tickets <spec hoặc issue>
```

Sau đó mở context sạch cho từng ticket:

```text
/skill:implement #<ticket-number>
```

`implement` sử dụng TDD khi phù hợp, chạy typecheck/test thường xuyên, chạy full checks ở cuối và review thay đổi trước khi hoàn tất.

### 4. Review trước khi ship

```text
/skill:code-review <commit|branch|tag|merge-base>
```

Review chạy theo hai trục:

- **Standards** — code có tuân theo chuẩn và kiến trúc của repo không?
- **Spec** — code có thực hiện đúng issue, PRD hoặc spec không?

## On-ramp: issue hoặc request từ bên ngoài

Dùng triage cho bug report, feature request hoặc PR thô do người khác gửi vào:

```text
/skill:triage
/skill:triage #42
```

State machine:

```text
needs-triage
    ├── thiếu thông tin ──→ needs-info
    ├── agent làm được ───→ ready-for-agent ──→ /skill:implement
    ├── cần con người ────→ ready-for-human
    └── không thực hiện ──→ wontfix
```

Không triage lại ticket do `/skill:to-tickets` tạo; các ticket đó đã được chuẩn bị để triển khai.

Issue tracker của repo là GitHub Issues và được thao tác qua `gh`, theo `docs/agents/issue-tracker.md`.

## On-ramp: bug khó hoặc performance regression

```text
/skill:diagnosing-bugs <mô tả lỗi>
```

Flow chẩn đoán:

```text
tạo feedback loop đang fail
    → tái hiện và thu nhỏ lỗi
    → đặt giả thuyết
    → kiểm chứng bằng bằng chứng
    → viết regression test
    → sửa lỗi
    → chạy checks
```

Dùng flow này cho lỗi khó tái hiện, flaky test, regression hoặc vấn đề hiệu năng. Với hành vi cụ thể đã rõ và chỉ cần làm test-first, có thể gọi trực tiếp:

```text
/skill:tdd <hành vi cần xây hoặc sửa>
```

Nếu root cause là codebase thiếu seam tốt để test, chuyển sang flow cải thiện kiến trúc.

## On-ramp: dự án rất lớn và còn nhiều điều chưa biết

```text
/skill:wayfinder <destination>
```

Dùng khi công việc quá lớn để giữ trong một session và chưa nhìn thấy đường từ hiện trạng tới mục tiêu. Wayfinder tạo trên issue tracker:

- một map issue;
- các decision ticket;
- blocking dependencies;
- decisions so far;
- fog — các câu hỏi chưa được giải quyết;
- out-of-scope.

Wayfinder tạo **quyết định**, không trực tiếp xây deliverable. Khi bản đồ đã rõ, quay lại flow chính:

```text
/skill:wayfinder
    → /skill:to-spec
    → /skill:to-tickets
    → /skill:implement
```

Không đi thẳng từ một map lớn sang implementation vì sẽ làm mất cấu trúc quyết định đã thu thập.

## Flow cải thiện kiến trúc codebase

```text
/skill:improve-codebase-architecture
```

Flow này:

1. Quét codebase để tìm architectural friction.
2. Tìm các cơ hội biến module nông thành module sâu.
3. Sinh báo cáo HTML trực quan.
4. Để người dùng chọn một cơ hội.
5. Grill thiết kế của refactor đã chọn.
6. Chuyển kết quả sang flow chính để spec hoặc implement.

```text
/skill:improve-codebase-architecture
    → /skill:grill-with-docs
    → /skill:to-spec hoặc /skill:implement
    → /skill:code-review
```

Hai skill nền hỗ trợ flow này:

- `/skill:codebase-design` — thiết kế module, interface, seam và adapter.
- `/skill:domain-modeling` — làm rõ domain language và ghi quyết định kiến trúc.

## Flow qua nhiều session

Khi context gần đầy, cần tách nhánh prototype hoặc cần chuyển việc cho agent/session khác:

```text
/skill:handoff <mục đích của session tiếp theo>
```

Handoff tạo một tài liệu tạm gồm trạng thái, quyết định, việc còn lại, tham chiếu tới artifact hiện có và skill đề xuất. Mở session mới rồi cung cấp file đó cho agent.

Phân biệt:

- `/skill:handoff` — chuyển sang session mới và mang theo context cần thiết.
- `/compact` — tiếp tục cùng conversation bằng bản tóm tắt.

Dùng handoff quanh một prototype độc lập:

```text
session thiết kế
    → /skill:handoff
session prototype mới
    → /skill:prototype
    → /skill:handoff
session thiết kế mới
    → tiếp tục từ kết luận prototype
```

## Flow giải quyết merge conflict

Khi đang có merge/rebase conflict:

```text
/skill:resolving-merge-conflicts
```

Agent sẽ đọc lịch sử, commit, PR và issue để hiểu intent của hai phía; resolve từng hunk mà không tự thêm behavior mới; sau đó chạy các checks của repo. Flow này luôn resolve, không tự abort merge/rebase.

## Flow độc lập

### Học một chủ đề qua nhiều session

```text
/skill:teach <chủ đề>
```

Dùng workspace hiện tại để lưu trạng thái học tập, lesson và tiến độ.

### Viết hoặc chỉnh sửa skill

```text
/skill:writing-great-skills <mục tiêu>
```

Cung cấp nguyên tắc để viết skill nhất quán và dễ dự đoán.

### Cấu hình bộ workflows lần đầu

```text
/skill:setup-matt-pocock-skills
```

Thiết lập issue tracker, triage labels và cấu trúc domain docs mà các engineering workflow sử dụng. Repo này đã được cấu hình với:

- GitHub Issues: `docs/agents/issue-tracker.md`;
- năm triage label chuẩn: `docs/agents/triage-labels.md`;
- single-context domain docs: `docs/agents/domain.md` và `CONTEXT.md`.

## Bảng chọn nhanh

| Tình huống | Lệnh bắt đầu |
| --- | --- |
| Không biết chọn flow nào | `/skill:ask-matt` |
| Có ý tưởng tính năng trong codebase | `/skill:grill-with-docs` |
| Ý tưởng ngoài codebase | `/skill:grill-me` |
| Yêu cầu nhỏ, đã rõ | `/skill:implement` |
| Cần tạo PRD/spec từ hội thoại | `/skill:to-spec` |
| Cần chia spec thành ticket | `/skill:to-tickets` |
| Dự án hoặc feature rất lớn, còn mơ hồ | `/skill:wayfinder` |
| Bug khó, flaky hoặc regression | `/skill:diagnosing-bugs` |
| Muốn làm red-green-refactor | `/skill:tdd` |
| Triage issue/PR từ bên ngoài | `/skill:triage` |
| Review branch, PR hoặc WIP | `/skill:code-review` |
| Tìm cơ hội refactor kiến trúc | `/skill:improve-codebase-architecture` |
| Làm rõ domain language hoặc ADR | `/skill:domain-modeling` |
| Thiết kế module/interface/seam | `/skill:codebase-design` |
| Cần kiểm chứng logic hoặc UI | `/skill:prototype` |
| Cần đọc primary sources | `/skill:research` |
| Chuyển sang session khác | `/skill:handoff` |
| Đang có merge/rebase conflict | `/skill:resolving-merge-conflicts` |
| Muốn học một chủ đề | `/skill:teach` |

## Nguyên tắc vận hành

1. Dùng `/skill:ask-matt` nếu không chắc flow nào phù hợp.
2. Giữ grilling → spec → tickets trong cùng context khi còn nằm trong smart zone.
3. Mở context sạch cho từng implementation ticket.
4. Dùng research và prototype để trả lời câu hỏi, không thay thế bước ra quyết định.
5. Dùng triage cho request thô từ bên ngoài, không dùng cho ticket đã tạo từ spec.
6. Review cả Standards lẫn Spec trước khi ship.
7. Dùng handoff thay vì cố tiếp tục khi context đã quá lớn.
8. Không workflow nào tự commit; commit là hành động riêng khi người dùng yêu cầu.
9. Artifact trung gian nằm trong `.pi-subagents/`; deliverable trong repo phải được parent kiểm tra tồn tại, nội dung và nguồn.

## Kiểm tra repository

Không chạy live smoke test model/network/TUI trong quy trình tích hợp hoặc CI. Sau khi sửa workflow/config, chỉ chạy cổng deterministic:

```text
npm run check
```

Cổng này gồm fork-hash guard, typecheck, lint, format check, tests và package-content verification. Trước commit/push, kiểm tra thêm `git diff --check`, xác nhận `.pi/npm/` và `.pi-subagents/` vẫn bị ignore, không có credential, và `skills-lock.json`/root `package-lock.json` không bị thay đổi ngoài chủ đích.
