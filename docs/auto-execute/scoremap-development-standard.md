# scoremap development standard

## Non-negotiable rules
- Tie every future code change to a task ID and requirement/API/UI row.
- Source-of-truth order: current user prompt, AGENTS.md, PRD v1.2, UI PNG/Stitch references, existing code, reference project patterns.
- Use printersheet only for architecture patterns such as local adapters, mini-program layout, server organization, and test harness style; do not import unrelated requirements.
- Keep every future task small, reviewable, reversible, and inside its allowed file scope.
- All Tencent Cloud, WeChat Pay, storage, AI, and database behavior must default to local/mock adapters in tests.
- Do not claim implementation complete without result JSON, HANDOFF, tests, and evidence paths.

## Lifecycle standard
| Phase | Required work product | Exit criteria |
|---|---|---|
| Intake | source inventory, blocker list, task scope | PRD/UI/code/reference sources mapped |
| Design | requirement/UI/API/DB matrices | all P0/P1 rows trace to tasks |
| Implementation | task-local code changes | allowed files only, no hidden scope |
| Verification | page/API/DB/UI/owner evidence | relevant standard-test-plan rows pass |
| Handoff | result JSON and HANDOFF | next worker can resume from evidence |
| Final gate | final acceptance report | fail closed on missing P0 proof |

## Product quality rules
| Area | Development rule | Required evidence |
|---|---|---|
| Functional suitability | PRD flow upload -> preview -> 1 yuan -> basic -> 9.9 yuan -> full report must work locally | requirement matrix and owner traces |
| Usability | Every page has loading, empty, error, success, disabled, and recovery states where relevant | screenshots and click traces |
| Reliability | state machine must survive refresh, retry, payment callback, and failure recovery | route/API/DB regression tests |
| Security | owner access, payment entitlement, validation, and secret safety are mandatory | authz tests and secret guard |
| Maintainability | follow local patterns, avoid broad unrelated refactors | task handoff and code review notes |
| Portability | clean local start commands and env examples | local runtime evidence |
| Safety | no real cloud/payment/online DB side effects | local-only guard logs |

## Frontend rules
- Every P0 page must map to a UI reference and a route.
- Every visible P0 control must be clickable or intentionally disabled with a visible reason.
- Every click must declare expected route, modal, toast, API call, state mutation, or validation message.
- Page text must match PRD wording, especially 1 元解锁完整初判 and 9.9 元解锁完整提分报告.
- Do not implement a generic dashboard in place of a specific UI reference.
- If a PDF download button is visible, local PDF export must work; otherwise hide it.
- Pro/member UI is only a placeholder or historical rights surface; no real subscription.

## Backend/API rules
- Every route needs method, path, auth rule, request schema, response schema, error envelope, and side-effect owner.
- Every P0 mutation must write local DB data and have an independent readback assertion.
- Payment create/callback must be local mock only, idempotent, and able to simulate paid, failed, cancelled, duplicate callback, and recovery.
- Tencent CloudBase/storage/database must be represented by local adapters and test fixtures only.
- Error responses must be user-safe and developer-debuggable without leaking secrets.

## Database rules
Required local entities: users, diagnosis_orders, upload_files, i_analysis_tasks, diagnosis_decisions, payments, eport_exports, eedbacks.

Each entity must define owner, seed data, mutation path, readback path, cleanup policy, and export fields before final PASS.

## Frontend/backend contract rules
- Every frontend caller must map to scoremap-api-db-contract-matrix.md.
- Request/response DTOs must be validated by tests or typed fixtures.
- Contract drift is REPAIR_REQUIRED.

## Forbidden actions
- No real Tencent Cloud calls.
- No real WeChat Pay calls.
- No online database calls.
- No production secrets, merchant IDs, app secrets, or real openid fixtures.
- No destructive cleanup of user work.
- No pure PASS without page, API, DB, visual, owner, and safety evidence.