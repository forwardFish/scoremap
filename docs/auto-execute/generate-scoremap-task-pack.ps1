param(
  [string]$ProjectRoot = "D:\lyh\agent\agent-frame\scoremap"
)

$ErrorActionPreference = "Stop"

$slug = "scoremap"
$autoDir = Join-Path $ProjectRoot "docs\auto-execute"
$taskDir = Join-Path $autoDir "$slug-tasks"
$resultDir = Join-Path $autoDir "results"
$latestDir = Join-Path $autoDir "latest"

New-Item -ItemType Directory -Force -Path $autoDir, $taskDir, $resultDir, $latestDir | Out-Null

$prd = "D:\lyh\agent\agent-frame\scoremap\docs\AI提分决策_PRD_MVP_v1.2_C端页面流程修订版.md"
$ui = "D:\lyh\agent\agent-frame\scoremap\docs\UI\小程序"
$stitch = "D:\lyh\agent\agent-frame\scoremap\docs\UI\小程序\stitch_codex_development_blueprints"
$ref = "D:\lyh\agent\agent-frame\printersheet"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content.TrimStart(), $utf8)
}

$globalInputs = @"
项目根目录：$ProjectRoot
需求文档：$prd
UI 目录：$ui
Stitch UI 代码目录：$stitch
参考项目：$ref
强制策略：所有测试、支付、云、数据库均使用本地数据和本地模拟适配器；禁止真实调用腾讯云、微信支付或线上数据库。
"@

$tasks = @(
  @{ Id="T00"; Name="intake-harness-and-source-of-truth"; Title="证据盘点与验收框架"; Surface="documentation+harness"; Scope="建立 docs/auto-execute/latest、results、evidence 目录；读取 PRD、UI、Stitch、参考项目；产出源文档清单、缺口清单、验收状态枚举、结果 JSON schema、报告完整性检查脚本。"; Files="docs/auto-execute/**, scripts/acceptance/**"; Tests="powershell -ExecutionPolicy Bypass -File scripts/acceptance/check-report-integrity.ps1" },
  @{ Id="T01"; Name="local-runtime-scaffold"; Title="本地全栈脚手架"; Surface="scaffold"; Scope="创建 scoremap-miniapp、server、shared 或等价结构；提供本地启动、测试、fixture、env.example；默认 LOCAL_ONLY=true；不得引入真实云密钥。"; Files="package.json, scoremap-miniapp/**, server/**, shared/**, scripts/**"; Tests="npm install; npm test; npm run build --if-present" },
  @{ Id="T02"; Name="local-db-cloud-payment-adapters"; Title="本地数据库、腾讯云、本地支付适配器"; Surface="backend-adapters"; Scope="参考 printersheet 的 LocalDbAdapter、localFile、payment.js 思路，落地 users、diagnosis_orders、upload_files、ai_analysis_tasks、diagnosis_decisions、payments、report_exports、feedbacks 的本地 JSON/SQLite 适配器；腾讯云与微信支付仅 mock。"; Files="server/src/adapters/**, server/src/db/**, server/test/**"; Tests="npm --prefix server test -- adapters local-db payment" },
  @{ Id="T03"; Name="orders-uploads-preview-api"; Title="订单、上传、初判预览 API"; Surface="backend-api"; Scope="实现 POST /api/diagnosis-orders、POST /api/diagnosis-orders/{orderId}/uploads、POST /start-preview-analysis、GET /analysis-progress、GET /preview-decision，含低质图片、超时、失败枚举。"; Files="server/src/routes/**, server/src/services/**, server/test/**"; Tests="npm --prefix server test -- orders uploads preview" },
  @{ Id="T04"; Name="payment-api-and-entitlements"; Title="1 元与 9.9 元本地支付闭环"; Surface="backend-api-payment"; Scope="实现 POST /api/payments/create、POST /api/payments/wechat/callback 的本地模拟；校验 basic/full 权益、幂等、取消、失败、补偿恢复；不得调用真实微信支付。"; Files="server/src/routes/**, server/src/services/**, server/test/payment*.js"; Tests="npm --prefix server test -- payment entitlement" },
  @{ Id="T05"; Name="full-report-feedback-export-api"; Title="完整报告、PDF、反馈、数据导出 API"; Surface="backend-api-report"; Scope="实现 GET /basic-decision、POST /generate-full、GET /full-report、POST /save-report、GET /my/reports、POST /feedback、POST /export-pdf、GET /report-exports/{id}、运营导出脚本。"; Files="server/src/routes/**, server/src/services/**, server/scripts/**, server/test/**"; Tests="npm --prefix server test -- report feedback export" },
  @{ Id="T06"; Name="miniapp-shell-navigation-and-contract"; Title="小程序壳、路由、接口契约"; Surface="frontend-shell"; Scope="建立小程序页面壳、底部 Tab、API client、fixture 注入、路由守卫、状态到页面跳转表；页面不可接真实生产 API。"; Files="scoremap-miniapp/app.*, scoremap-miniapp/pages/**, scoremap-miniapp/services/**, scoremap-miniapp/utils/**"; Tests="npm test -- miniapp-shell; npm run lint --if-present" },
  @{ Id="T07"; Name="c01-home-upload-auth"; Title="C01 首页与 C02 上传授权"; Surface="frontend-page"; Scope="按 首页.png 与 Stitch ai_2 复刻首页；实现上传资料、授权确认、创建订单、最近报告、查看样例、我的报告入口、底部 Tab。"; Files="scoremap-miniapp/pages/index/**, scoremap-miniapp/components/**, docs/auto-execute/evidence/**"; Tests="npm test -- home-upload; npm run visual:scoremap -- home" },
  @{ Id="T08"; Name="c03-analysis-and-c04-failure"; Title="C03 AI 分析中与 C04 处理失败"; Surface="frontend-page"; Scope="按 AI分析.png、处理失败.png 与 Stitch ai_1/_3 复刻进度页和失败页；实现 2 秒轮询、30 秒超时、稍后查看、刷新、失败恢复按钮。"; Files="scoremap-miniapp/pages/analysis/**, scoremap-miniapp/pages/failure/**, docs/auto-execute/evidence/**"; Tests="npm test -- analysis-failure; npm run visual:scoremap -- analysis failure" },
  @{ Id="T09"; Name="c05-preview-and-c06-basic-pay-confirm"; Title="C05 初判预览与 C06 1 元确认"; Surface="frontend-page"; Scope="按 分析报告.png、1元支付.png 与 Stitch 1 复刻预览、锁定区、1 元确认页；按钮文案必须是完整初判，不得写完整报告。"; Files="scoremap-miniapp/pages/preview/**, scoremap-miniapp/pages/basic-pay/**"; Tests="npm test -- preview-basic-pay; npm run visual:scoremap -- preview basic-pay" },
  @{ Id="T10"; Name="c07-basic-result-and-c08-full-unlock"; Title="C07 AI 初判结果与 C08 解锁完整分析"; Surface="frontend-page"; Scope="按完整初判结果、解锁完整分析 Stitch _4 复刻；展示 basic decision 字段、9.9 升级权益、合规文案、支付入口。"; Files="scoremap-miniapp/pages/basic-result/**, scoremap-miniapp/pages/full-unlock/**"; Tests="npm test -- basic-result-full-unlock; npm run visual:scoremap -- basic-result full-unlock" },
  @{ Id="T11"; Name="c09-c10-full-report-and-pdf"; Title="C09 完整提分报告入口与 C10 PDF 式报告"; Surface="frontend-page"; Scope="按完整提分报告.png、完整报告.png 与 Stitch _2/ai_pdf 复刻入口与纸质报告；若展示下载 PDF 必须真实生成本地 PDF，否则隐藏按钮。"; Files="scoremap-miniapp/pages/full-report-entry/**, scoremap-miniapp/pages/full-report/**, server/src/report/**"; Tests="npm test -- full-report-pdf; npm run visual:scoremap -- full-report-entry full-report" },
  @{ Id="T12"; Name="c11-c12-my-reports-orders-feedback"; Title="C11 我的与 C12 我的报告列表"; Surface="frontend-page"; Scope="按 我的.png 与 Stitch _1 复刻我的页；实现我的报告、订单记录、购买记录、帮助反馈、继续新建分析；Pro 仅作权益占位。"; Files="scoremap-miniapp/pages/my/**, scoremap-miniapp/pages/reports/**, scoremap-miniapp/pages/orders/**, scoremap-miniapp/pages/feedback/**"; Tests="npm test -- my-reports-feedback; npm run visual:scoremap -- my reports" },
  @{ Id="T13"; Name="auth-permission-state-recovery"; Title="权限、状态机、支付恢复"; Surface="contract-security"; Scope="校验 order owner、access_level、支付状态、报告生成状态；未登录/匿名绑定；支付成功页面关闭后的恢复；401/404/500/timeout 错误处理。"; Files="server/src/middleware/**, server/src/services/**, scoremap-miniapp/services/**, server/test/**"; Tests="npm --prefix server test -- auth recovery errors" },
  @{ Id="T14"; Name="visual-one-to-one-comparison-harness"; Title="页面一比一复刻对比工具"; Surface="visual-harness"; Scope="建立从 UI PNG 和 Stitch screen.png 到本地页面截图的 capture+pixelmatch 或等价比较；每个 P0 页面输出 reference、actual、diff、metrics、summary。"; Files="tools/ui-visual/**, docs/auto-execute/evidence/visual/**"; Tests="npm --prefix tools/ui-visual test; npm run visual:scoremap -- all" },
  @{ Id="T15"; Name="parent-owner-click-e2e"; Title="家长全流程点击验收"; Surface="e2e-owner"; Scope="实现家长从首页上传、授权、分析、1 元解锁、9.9 解锁、保存、我的报告复看、反馈、失败恢复的点击 E2E；记录每步 route、API、DB、截图。"; Files="tests/e2e/**, docs/auto-execute/evidence/owner/**"; Tests="npm run e2e:owner" },
  @{ Id="T16"; Name="api-db-readback-e2e"; Title="接口调用与数据库断言 E2E"; Surface="api-db-e2e"; Scope="覆盖所有 API 的 2xx/4xx/5xx/timeout、本地 DB mutation/readback、导出字段；输出 API trace、DB snapshot、断言 JSON。"; Files="tests/api/**, server/test/**, docs/auto-execute/evidence/api-db/**"; Tests="npm run e2e:api-db" },
  @{ Id="T17"; Name="local-only-guards-secret-scan"; Title="本地模拟边界与密钥防护"; Surface="safety"; Scope="证明腾讯云、微信支付、线上 DB 未被调用；secret guard 扫描 env、源码、日志；生产域名/密钥/云 SDK 调用必须失败关闭或 mock。"; Files="scripts/acceptance/**, docs/auto-execute/evidence/safety/**"; Tests="powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-local-only-guard.ps1; powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-secret-guard.ps1" },
  @{ Id="T18"; Name="final-acceptance-gate"; Title="最终验收闸门"; Surface="final-gate"; Scope="读取全部 results/*.json、owner matrix、visual summary、API/DB evidence、secret guard、report integrity；只允许证据齐全时 PASS，否则输出 REPAIR_REQUIRED/PASS_WITH_LIMITATION。"; Files="scripts/acceptance/run-final-gate.ps1, docs/auto-execute/final/**"; Tests="powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-final-gate.ps1" }
)

$taskRows = ($tasks | ForEach-Object { "| $($_.Id) | $($_.Title) | $($_.Surface) | $($_.Tests) | docs/auto-execute/results/$($_.Id).json | PLANNED |" }) -join "`n"

$deliveryIndex = @"
# scoremap delivery standard index

## Scope
- Project root: $ProjectRoot
- Project slug: $slug
- Generated by: xwstarmap-auto-execute
- Execution boundary: documentation-only task-pack generation; this generator must not run product code, start apps, click pages, call APIs, or mutate databases.

## Source of truth
| Priority | Source | Path/Location | Notes | Status |
|---|---|---|---|---|
| 1 | User prompt | current Codex request | Generate task pack, local-only mocks, full page/API/DB/UI/owner evidence before PASS | CONFIRMED |
| 2 | AGENTS.md | $ProjectRoot\AGENTS.md | autonomous execution, evidence-first completion, Lore commit protocol | CONFIRMED |
| 3 | PRD | $prd | MVP v1.2 C-end page flow and API/data requirements | CONFIRMED |
| 4 | UI references | $ui | PNG screens and Stitch blueprints for one-to-one visual targets | CONFIRMED |
| 5 | Reference project | $ref | local mini-program/server adapter patterns only; not a second requirements source | CONFIRMED |
| 6 | Existing product code | $ProjectRoot | currently documentation-first repo; product scaffold belongs to T01 | BLOCKED_BY_MISSING_SOURCE until T01 |

## Standard basis
| Standard area | Practical basis | How this pack uses it |
|---|---|---|
| Lifecycle | ISO/IEC/IEEE 12207 style | intake -> design matrices -> implementation tasks -> verification -> handoff -> final gate |
| Product quality | ISO/IEC 25010 style | functional, reliability, security, usability, maintainability, portability, safety |
| Testing | ISO/IEC/IEEE 29119 style | test planning, design, execution evidence, defect repair, final reporting |
| Secure development | NIST SSDF / OWASP ASVS style | local-only adapters, authz, validation, secret guard, error envelopes |
| Accessibility | WCAG 2.2 style | mobile text fit, contrast, labels, focus/click affordance where applicable |
| API contract | OpenAPI style | method/path/request/response/error/side-effect rows for every API |
| Delivery evidence | DORA-style evidence discipline | JSON results, logs, screenshots, DB readbacks, final fail-closed gate |

## Generated documents
| Document | Purpose | Required before PASS |
|---|---|---|
| `scoremap-delivery-standard-index.md` | entrypoint, source order, evidence/status contract | yes |
| `scoremap-development-standard.md` | implementation rules for future workers | yes |
| `scoremap-software-test-standard.md` | QA rules for page/API/DB/UI/owner proof | yes |
| `scoremap-auto-execute-master-plan.md` | task sequence and final goal | yes |
| `scoremap-requirement-traceability-matrix.md` | PRD coverage by task/evidence | yes |
| `scoremap-ui-reference-map.md` | UI reference to route/control/visual proof map | yes |
| `scoremap-api-db-contract-matrix.md` | API, auth, DTO, DB readback map | yes |
| `scoremap-standard-test-plan.md` | future commands and acceptance evidence | yes |
| `scoremap-owner-scenario-matrix.md` | parent owner journeys and click proof | yes |
| `scoremap-final-acceptance-gate.md` | final fail-closed verdict rules | yes |
| `scoremap-codex-exec-prompts-split.md` | one future codex exec command per task | yes |
| `scoremap-tasks/*.md` | task-local execution documents | yes |

## Evidence locations
| Evidence type | Required path pattern |
|---|---|
| Task result JSON | `docs/auto-execute/results/<TASK-ID>.json` |
| HANDOFF | `docs/auto-execute/latest/<TASK-ID>-HANDOFF.md` |
| Screenshots | `docs/auto-execute/evidence/<surface>/screenshots/` |
| Visual diffs | `docs/auto-execute/evidence/visual/<page>/diff.png` |
| API transcripts | `docs/auto-execute/evidence/api-db/<api-id>.json` |
| DB readbacks | `docs/auto-execute/evidence/api-db/readbacks/<entity>.json` |
| Owner traces | `docs/auto-execute/evidence/owner/<scenario-id>.json` |
| Safety logs | `docs/auto-execute/evidence/safety/` |
| Final report | `docs/auto-execute/final/` |

## Status vocabulary
| Status | Meaning |
|---|---|
| PLANNED | Written into this pack but not executed yet |
| PASS | All task-local required evidence exists and passes |
| REPAIR_REQUIRED | Product or evidence gap must be repaired before continuing |
| PASS_WITH_LIMITATION | Non-P0 limitation remains and is explicit |
| PASS_NEEDS_MANUAL_UI_REVIEW | Functional evidence exists but visual review is not fully automated |
| BLOCKED_BY_ENVIRONMENT | Required local tool/runtime unavailable |
| BLOCKED_BY_MISSING_SOURCE | Required PRD/UI/code evidence missing |
| HARD_FAIL | Safety breach or unrecoverable verification failure |

## False PASS rules
Pure PASS is forbidden unless every P0 page, route, click, API, DB mutation/readback, visual comparison, local-only safety check, and parent owner journey has evidence. Backend-green without page evidence, page screenshots without API/DB readback, or narrative-only reports are not PASS.
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-delivery-standard-index.md") $deliveryIndex

$developmentStandard = @"
# scoremap development standard

## Non-negotiable rules
- Tie every future code change to a task ID and requirement/API/UI row.
- Source-of-truth order: current user prompt, `AGENTS.md`, PRD v1.2, UI PNG/Stitch references, existing code, reference project patterns.
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
- Page text must match PRD wording, especially `1 元解锁完整初判` and `9.9 元解锁完整提分报告`.
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
Required local entities: `users`, `diagnosis_orders`, `upload_files`, `ai_analysis_tasks`, `diagnosis_decisions`, `payments`, `report_exports`, `feedbacks`.

Each entity must define owner, seed data, mutation path, readback path, cleanup policy, and export fields before final PASS.

## Frontend/backend contract rules
- Every frontend caller must map to `scoremap-api-db-contract-matrix.md`.
- Request/response DTOs must be validated by tests or typed fixtures.
- Contract drift is `REPAIR_REQUIRED`.

## Forbidden actions
- No real Tencent Cloud calls.
- No real WeChat Pay calls.
- No online database calls.
- No production secrets, merchant IDs, app secrets, or real openid fixtures.
- No destructive cleanup of user work.
- No pure PASS without page, API, DB, visual, owner, and safety evidence.
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-development-standard.md") $developmentStandard

$softwareTestStandard = @"
# scoremap software test standard

## Test process
| Step | Required output | Failure handling |
|---|---|---|
| Plan | test rows in `scoremap-standard-test-plan.md` | missing P0 row blocks PASS |
| Design | cases per requirement/page/API/entity/scenario | missing P0 case is `REPAIR_REQUIRED` |
| Environment | local start commands, fixtures, `LOCAL_ONLY=true` | unavailable tool is `BLOCKED_BY_ENVIRONMENT` |
| Execute | logs, screenshots, API transcripts, DB readbacks | missing evidence fails closed |
| Repair | defect note plus rerun | do not hide failures |
| Report | result JSON and HANDOFF | narrative alone is insufficient |
| Final gate | machine-readable verdict | pure PASS only with all P0 evidence |

## Local run standard
Future workers must define and prove local commands for backend, mini-program/front-end, local DB/mock storage, visual harness, API harness, owner E2E, report integrity, secret guard, and final gate. If a command is not yet available, the responsible task must implement it or report `REPAIR_REQUIRED`.

## Frontend page standard
Every P0 page must be opened or navigated to from a clean local run. Evidence must include:
- route and previous click path;
- rendered screenshot;
- list of clicked controls;
- expected route/modal/toast/state/API for each control;
- loading, empty, error, success, unauthorized, and persisted-data states where applicable.

## Visual one-to-one standard
Every UI PNG and Stitch `screen.png` must map to a local page screenshot. Future visual evidence must include reference, actual, diff, metrics JSON, viewport/miniprogram dimensions, allowed deviations, and verdict. Missing visual proof means `PASS_NEEDS_MANUAL_UI_REVIEW` or `REPAIR_REQUIRED`, never pure PASS.

## Backend/API standard
Every API in the matrix must test:
- success;
- request validation failure;
- auth/ownership failure;
- permission/entitlement failure where applicable;
- not found where applicable;
- duplicate/conflict where applicable;
- timeout or fallback behavior where applicable;
- local DB mutation and independent readback where applicable.

## Database standard
Every P0 business side effect must have mutation proof and independent readback proof. Export evidence must cover upload, payment, report, feedback, failure, and recovery data.

## Owner journey standard
The parent owner E2E must click every P0 page, tab, card, button, modal, form, and workflow action. Each step must record route, visible UI, API call, DB readback, screenshot/trace path, and pass/fail status.

## Local-only safety standard
Every verification run must prove:
- `LOCAL_ONLY=true`;
- payment adapter is mock;
- Tencent Cloud/storage/database adapter is local;
- no production domain or online DB URL was contacted;
- secret guard passed on env, source, logs, and evidence.

## Final PASS rule
Pure PASS is forbidden unless all P0 requirements, pages, APIs, DB side effects, visual references, local-only guards, and owner clicks have evidence. A backend-only green state, screenshots without DB proof, or manually asserted success is not PASS.
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-software-test-standard.md") $softwareTestStandard

$master = @"
# scoremap auto-execute master plan

## Source of truth
$globalInputs

## Execution contract
One task document equals one fresh `codex exec` boundary. Run tasks in lexical order from `docs/auto-execute/scoremap-tasks`. A task may implement only its declared surface and must write:

- `docs/auto-execute/results/<TASK-ID>.json`
- `docs/auto-execute/latest/<TASK-ID>-HANDOFF.md`
- evidence under `docs/auto-execute/evidence/<surface>/`

## Local-only safety
- `LOCAL_ONLY=true` is mandatory.
- Payment must use a local WeChat Pay mock; no real payment request, callback signing against production, merchant credential, or Tencent endpoint is allowed.
- Tencent CloudBase/storage/database must use local mock adapters.
- Online database URLs, production domains, and cloud secrets are forbidden in tests.
- Final gate fails closed if any log shows a real cloud/payment/online DB call.

## Task table
| Task | Name | Surface | Required verification | Result JSON | Status |
|---|---|---|---|---|---|
$taskRows

## Final PASS conditions
Pure PASS requires evidence for every P0 page, API, DB mutation/readback, UI comparison, local-only safety guard, and parent owner journey. Missing screenshots, missing route/API/DB trace, missing visual metrics, missing result JSON, or any task status of `REPAIR_REQUIRED`, `HARD_FAIL`, or `BLOCKED_BY_MISSING_SOURCE` prevents pure PASS.

## Known blockers at pack generation
- The repo currently has no product source code, so T01 must create the local full-stack scaffold before implementation tasks can run.
- UI blueprints use external image URLs in HTML; implementation tasks must replace them with local assets, bundled placeholders, or documented deterministic mocks.
- Real WeChat/Tencent/online DB evidence is intentionally out of scope and forbidden.
"@

Write-Utf8NoBom (Join-Path $autoDir "$slug-auto-execute-master-plan.md") $master

$trace = @"
# scoremap requirement traceability matrix

| Req ID | Requirement | Source | UI state | Backend/API | DB/Storage | Implement task | Verify task | Evidence path | Status |
|---|---|---|---|---|---|---|---|---|---|
| R01 | 首页可进入、上传资料、最近报告、底部 Tab | PRD 7 C01, 17.1 | 首页.png, Stitch ai_2 | POST /api/diagnosis-orders, POST uploads | users, diagnosis_orders, upload_files | T07 | T15 | docs/auto-execute/evidence/owner/home-upload.json | PLANNED |
| R02 | 上传前隐私授权并记录授权状态 | PRD 7 C02, 16 | 首页上传弹窗 | POST uploads | upload_files.authorizationAccepted | T07 | T16 | docs/auto-execute/evidence/api-db/upload-auth.json | PLANNED |
| R03 | AI 分析中轮询、刷新、稍后查看、完成跳转 | PRD 7 C03, 10 | AI分析.png, Stitch ai_1 | GET analysis-progress | ai_analysis_tasks | T08 | T15 | docs/auto-execute/evidence/owner/analysis-progress.json | PLANNED |
| R04 | 处理失败页支持重新分析、重新上传、返回首页 | PRD 7 C04 | 处理失败.png, Stitch _3 | POST start-preview-analysis | ai_analysis_tasks.error_code | T08 | T15 | docs/auto-execute/evidence/owner/failure-recovery.json | PLANNED |
| R05 | 初判预览最多展示 3 模块并锁定完整内容 | PRD 5.2, 7 C05 | 分析报告.png | GET preview-decision | diagnosis_decisions.preview | T09 | T15 | docs/auto-execute/evidence/owner/preview.json | PLANNED |
| R06 | 1 元确认支付页与本地支付成功后解锁 basic | PRD 5.3, 7 C06, 12.6-12.8 | 1元支付.png, Stitch 1 | POST payments/create, POST callback, GET basic-decision | payments, diagnosis_orders.access_level | T04,T09 | T16 | docs/auto-execute/evidence/api-db/basic-payment.json | PLANNED |
| R07 | AI 初判结果展示完整 basic 字段并引导 9.9 | PRD 7 C07, 8.2 | 完整初判结果 | GET basic-decision | diagnosis_decisions.basic | T10 | T15 | docs/auto-execute/evidence/owner/basic-result.json | PLANNED |
| R08 | 9.9 解锁完整分析、本地支付、full 权益 | PRD 5.4, 7 C08, 12.9-12.10 | Stitch _4 | POST payments/create, callback, generate-full | payments, diagnosis_orders, diagnosis_decisions.full | T04,T10 | T16 | docs/auto-execute/evidence/api-db/full-payment.json | PLANNED |
| R09 | 完整提分报告入口和 PDF 式报告 | PRD 7 C09-C10, 8.3 | 完整提分报告.png, 完整报告.png, Stitch _2/ai_pdf | GET full-report, save-report, export-pdf | diagnosis_decisions.full, report_exports | T05,T11 | T15,T16 | docs/auto-execute/evidence/owner/full-report.json | PLANNED |
| R10 | 我的页、我的报告、订单/购买/反馈 | PRD 7 C11-C12, 12.12-12.13 | 我的.png, Stitch _1 | GET /api/my/reports, POST feedback | payments, feedbacks | T05,T12 | T15,T16 | docs/auto-execute/evidence/owner/my-reports.json | PLANNED |
| R11 | 权限与防越权，未付不可访问 paid 内容 | PRD 13 | route guards | all protected report APIs | users, diagnosis_orders, payments | T13 | T16 | docs/auto-execute/evidence/api-db/authz.json | PLANNED |
| R12 | 数据导出覆盖上传、支付、报告、反馈和失败数据 | PRD 15, 17.1 | N/A | export script/API | all local tables | T05 | T16 | docs/auto-execute/evidence/api-db/export.json | PLANNED |
| R13 | 页面视觉一比一对比 | PRD 14 | all UI PNG/Stitch screens | N/A | screenshot artifacts | T14 | T18 | docs/auto-execute/evidence/visual/summary.json | PLANNED |
| R14 | 家长完整点击旅程 | PRD 6, 17 | all P0 pages | all P0 APIs | all P0 tables | T15 | T18 | docs/auto-execute/evidence/owner/journey-summary.json | PLANNED |
| R15 | 本地云/支付模拟与 secret guard | User instruction, PRD 17.3 | N/A | local mocks only | local fixtures only | T17 | T18 | docs/auto-execute/evidence/safety/local-only.json | PLANNED |
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-requirement-traceability-matrix.md") $trace

$uiMap = @"
# scoremap UI reference map

| Ref | Source file | Target route/page | Required states and controls | Navigation/API | Required visual evidence | Allowed deviation |
|---|---|---|---|---|---|---|
| UI-C01 | docs/UI/小程序/首页.png; Stitch ai_2 | /pages/index/index | logo, title, upload card, privacy auth, sample, my reports, recent reports, bottom tab | upload -> create order -> analysis | visual/home/reference-actual-diff-metrics | External Stitch image URLs may be replaced by local assets with same composition. |
| UI-C03 | docs/UI/小程序/AI分析.png; Stitch ai_1 | /pages/analysis/index | progress ring, steps, later, refresh, auto redirect | GET analysis-progress | visual/analysis/* | Progress values must bind task state, not pure animation. |
| UI-C04 | docs/UI/小程序/处理失败.png; Stitch _3 | /pages/failure/index | reason, retry, reupload, home | retry API, upload route, home route | visual/failure/* | Failure illustration can be local deterministic asset. |
| UI-C05 | docs/UI/小程序/分析报告.png | /pages/preview/index | visible 3 modules, locked block, 1 yuan CTA | GET preview-decision, route basic-pay | visual/preview/* | Lock area must be obvious. |
| UI-C06 | docs/UI/小程序/1元支付.png; Stitch 1 | /pages/basic-pay/index | stepper, report summary, locked modules, pay button | POST payments/create, callback mock | visual/basic-pay/* | Button text must say 完整初判. |
| UI-C07 | docs/UI/小程序/完整初判结果.png or ChatGPT Image 2026年5月22日 23_02_21.png | /pages/basic-result/index | summary, quality, loss points, weaknesses, advice, upgrade CTA | GET basic-decision | visual/basic-result/* | If filename mapping is ambiguous, cite both PRD section and screenshot in evidence. |
| UI-C08 | Stitch _4 | /pages/full-unlock/index | entitlement card, four benefits, price, 9.9 CTA, compliance text | POST payments/create | visual/full-unlock/* | No guarantee-score wording. |
| UI-C09 | docs/UI/小程序/完整提分报告.png; Stitch _2 | /pages/full-report-entry/index | generated status, content list, view/save/home buttons | GET full-report, save-report | visual/full-report-entry/* | List contents must match PRD modules. |
| UI-C10 | Stitch ai_pdf | /pages/full-report/index | paper report, tabs, modules, save/download/return | GET full-report, export-pdf if visible | visual/full-report/* | Hide PDF button if export not implemented. |
| UI-C11 | docs/UI/小程序/我的.png; Stitch _1 | /pages/my/index | profile, rights, stats, reports, orders, purchases, feedback, new analysis, bottom tab | GET my/reports | visual/my/* | Pro must be renamed or marked non-subscription placeholder. |
| UI-C12 | PRD C12 | /pages/reports/index | report list by status and jump rules | GET my/reports | visual/reports/* | No generic empty dashboard accepted. |
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-ui-reference-map.md") $uiMap

$api = @"
# scoremap API and DB contract matrix

| Method | Path | Auth rule | Request DTO | Response DTO | Local DB mutation/readback | Frontend caller | Test/evidence |
|---|---|---|---|---|---|---|---|
| POST | /api/diagnosis-orders | anonymous allowed, binds local user | source, grade, subject, examType, materialType | orderId,status | users upsert; diagnosis_orders insert/readback | C01 upload | T03/T16 |
| POST | /api/diagnosis-orders/{orderId}/uploads | owner or anonymous order token | files[], authorizationAccepted | orderId,status,uploadedCount | upload_files insert; order status uploaded | C02 upload | T03/T16 |
| POST | /api/diagnosis-orders/{orderId}/start-preview-analysis | owner | none or retry flag | taskId,status | ai_analysis_tasks insert/update; preview decision mock | C03/C04 | T03/T16 |
| GET | /api/diagnosis-orders/{orderId}/analysis-progress | owner | path orderId | status,progress,currentStep,steps | ai_analysis_tasks readback | C03 | T03/T15 |
| GET | /api/diagnosis-orders/{orderId}/preview-decision | owner, preview_done | path orderId | status,accessLevel,decision | diagnosis_decisions.preview readback | C05 | T03/T16 |
| POST | /api/payments/create | owner | orderId,paymentType | paymentId,amount,paymentParams(mock) | payments pending insert | C06/C08 | T04/T16 |
| POST | /api/payments/wechat/callback | local mock signature only | paymentId,status,mockTransactionId | ok,status | payments paid/failed; order access_level/status | local payment mock | T04/T16 |
| GET | /api/diagnosis-orders/{orderId}/basic-decision | owner and access basic/full | path orderId | status,decision | diagnosis_decisions.basic readback | C07 | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/generate-full | owner and full_paid/full | path orderId | taskId,status | ai_analysis_tasks full; diagnosis_decisions.full | C08/C09 | T05/T16 |
| GET | /api/diagnosis-orders/{orderId}/full-report | owner and access full | path orderId | status,decision | diagnosis_decisions.full readback | C09/C10 | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/save-report | owner and access basic/full | path orderId | saved:true | diagnosis_orders saved flag/readback | C09/C10 | T05/T16 |
| GET | /api/my/reports | local user | query optional status | items[] | diagnosis_orders/payments join readback | C01/C11/C12 | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/feedback | owner and access basic/full | decisionLevel,rating,tags,text | feedbackId | feedbacks insert/readback | C11/C12/report | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/export-pdf | owner and access full | none | exportId,status | report_exports insert; local file URL | C10 | T05/T16 |
| GET | /api/report-exports/{exportId} | owner | path exportId | status,fileUrl | report_exports readback | C10 | T05/T16 |
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-api-db-contract-matrix.md") $api

$testPlan = @"
# scoremap standard test plan

## Local data policy
Use only local fixtures under `server/fixtures`, `scoremap-miniapp/fixtures`, and `docs/auto-execute/evidence`. Tests must set `LOCAL_ONLY=true`. Production-like Tencent Cloud, WeChat Pay, and online DB calls are forbidden.

## Test layers
- Backend unit/integration: adapters, services, routes, payment idempotency, permissions, state machine.
- Frontend static/page tests: each P0 page renders, controls have deterministic actions, route table matches PRD.
- Contract tests: request/response DTOs and error cases from the API/DB matrix.
- Full local flow smoke: upload -> preview -> 1 yuan -> basic -> 9.9 yuan -> full report -> save -> my reports -> feedback.
- Visual one-to-one comparison: UI PNG/Stitch screen versus local captures, with metrics JSON and diff PNG.
- Owner journey tests: every P0 click records visible UI, route, API call, DB readback, screenshot/trace.
- Safety tests: no production endpoint, no real payment, no real Tencent Cloud, no secrets in logs.
- Final gate: read task JSON files, fail closed on missing evidence.

## False PASS prohibitions
Do not mark PASS from narrative alone. Do not mark PASS if visual evidence is missing. Do not mark PASS if API passed but DB readback is missing. Do not mark PASS if backend is green but pages were not run. Do not mark PASS if payment/cloud mocks are not proven local-only.
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-standard-test-plan.md") $testPlan

$owner = @"
# scoremap owner scenario matrix

| Scenario | Persona intent | Preconditions | Exact clicks | Expected route/state | Expected API | Expected DB readback | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| O01 | 首次家长想上传试卷看初判 | clean local DB | 首页 -> 上传资料 -> 同意授权 -> 选择本地图片 | /analysis, progress visible | POST orders, POST uploads, POST start-preview-analysis | users/order/upload/task created | evidence/owner/O01.json + screenshots | PLANNED |
| O02 | 分析完成后查看免费预览 | O01 task completes | 等待/刷新 -> 自动跳转 | /preview, 3 modules + locked area | GET progress, GET preview-decision | preview decision exists; order preview_done | evidence/owner/O02.json | PLANNED |
| O03 | 付 1 元解锁完整初判 | O02 | 点击 1 元解锁 -> 确认支付 -> 本地支付成功 | /basic-result, full basic fields visible | POST payments/create, POST callback, GET basic-decision | payment paid; access basic; basic decision | evidence/owner/O03.json | PLANNED |
| O04 | 付 9.9 元解锁完整报告 | O03 | 点击 9.9 解锁 -> 确认本地支付 | /full-report-entry | POST payments/create, callback, POST generate-full, GET full-report | payment paid; access full; full decision | evidence/owner/O04.json | PLANNED |
| O05 | 保存并复看完整报告 | O04 | 查看完整报告 -> 保存报告 -> 我的 -> 我的报告 -> 点击报告 | /full-report and /reports | POST save-report, GET my/reports | saved flag; report visible | evidence/owner/O05.json | PLANNED |
| O06 | 提交完整报告反馈 | O04 | 报告/我的 -> 帮助反馈 -> 填写 -> 提交 | success toast | POST feedback | feedback inserted | evidence/owner/O06.json | PLANNED |
| O07 | 稍后查看分析中任务 | uploaded/analyzing fixture | 分析中 -> 稍后查看 -> 我的报告 -> 分析中卡片 | back to /analysis | GET my/reports, GET progress | task still processing | evidence/owner/O07.json | PLANNED |
| O08 | 失败后重新分析 | failed fixture | 处理失败 -> 重新开始分析 | /analysis then /preview or failure | POST start-preview-analysis | retry_count increment | evidence/owner/O08.json | PLANNED |
| O09 | 失败后重新上传 | failed/low_quality fixture | 处理失败 -> 重新上传资料 -> 上传 | /index upload or upload state | POST uploads | new upload record | evidence/owner/O09.json | PLANNED |
| O10 | 未付用户越权访问 basic/full | preview-only fixture | 直达 basic/full route | pay confirm or unauthorized state | GET basic/full returns 403 | no decision leak | evidence/owner/O10.json | PLANNED |
| O11 | API 401/404/500/timeout 显示可恢复文案 | error mocks | trigger each route | toast/failure/retry visible | mocked error responses | no corrupt mutation | evidence/owner/O11.json | PLANNED |
| O12 | 空数据与重复导入 | clean DB; duplicate upload fixture | 我的报告空态；重复上传同文件 | empty state; duplicate warning or separate record rule | GET reports, POST uploads | expected duplicate policy readback | evidence/owner/O12.json | PLANNED |
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-owner-scenario-matrix.md") $owner

$finalGate = @"
# scoremap final acceptance gate

## Inputs
- `docs/auto-execute/results/*.json`
- `docs/auto-execute/scoremap-requirement-traceability-matrix.md`
- `docs/auto-execute/scoremap-owner-scenario-matrix.md`
- `docs/auto-execute/evidence/visual/summary.json`
- `docs/auto-execute/evidence/owner/journey-summary.json`
- `docs/auto-execute/evidence/api-db/summary.json`
- `docs/auto-execute/evidence/safety/local-only.json`
- `docs/auto-execute/evidence/safety/secret-guard.json`

## PASS algorithm
1. Every task T00-T18 result JSON exists and has status `PASS`.
2. Every P0/P1 requirement row has implementation and verification evidence.
3. Every UI reference has reference, actual, diff, metrics, and a reviewed threshold outcome.
4. Every owner scenario O01-O12 has click, route, API, DB, and visible UI proof.
5. API/DB evidence covers all routes in the API/DB contract matrix, including error cases.
6. Local-only guard proves no real Tencent Cloud, WeChat Pay, or online DB call.
7. Report integrity and secret guard pass.

## Non-pass statuses
- `REPAIR_REQUIRED`: product or evidence failure that can be fixed locally.
- `PASS_WITH_LIMITATION`: non-P0 evidence gap explicitly accepted, no false PASS.
- `PASS_NEEDS_MANUAL_UI_REVIEW`: screenshots exist but human visual review is still required.
- `BLOCKED_BY_ENVIRONMENT`: required local tool/runtime is unavailable.
- `HARD_FAIL`: safety breach, destructive action, real cloud/payment usage, or unrecoverable test failure.
"@
Write-Utf8NoBom (Join-Path $autoDir "$slug-final-acceptance-gate.md") $finalGate

$promptSplitRows = @()
foreach ($task in $tasks) {
  $taskPath = Join-Path $taskDir "$($task.Id)-$($task.Name).md"
  $taskSurface = $task["Surface"]
  $taskFiles = $task["Files"]
  $prompt = "Use the auto-execute skill. Execute only this task document: $taskPath. Treat this as one fresh task boundary; do not merge adjacent tasks. Follow the scoremap auto-execute master plan, requirement traceability matrix, UI reference map, API/DB contract matrix, standard test plan, owner scenario matrix, and final gate. Use local data and local mock adapters only. Do not call Tencent Cloud, WeChat Pay, or any online database. Implement this task, run its tests, write result JSON and HANDOFF with evidence paths. Do not claim PASS without page, API, DB, route, visual, or owner evidence required by this task."
  $cmd = "Set-Location -LiteralPath '$ProjectRoot'; codex exec `"$prompt`""
  $doc = @"
# Task $($task.Id) - $($task.Title)

## Codex Exec
~~~powershell
$cmd
~~~

## 实现功能
$($task.Scope)

## 必须读取的输入
$globalInputs

还必须读取：
- `docs/auto-execute/scoremap-auto-execute-master-plan.md`
- `docs/auto-execute/scoremap-development-standard.md`
- `docs/auto-execute/scoremap-software-test-standard.md`
- `docs/auto-execute/scoremap-requirement-traceability-matrix.md`
- `docs/auto-execute/scoremap-ui-reference-map.md`
- `docs/auto-execute/scoremap-api-db-contract-matrix.md`
- `docs/auto-execute/scoremap-standard-test-plan.md`
- `docs/auto-execute/scoremap-owner-scenario-matrix.md`
- 当前任务相关的源码、测试、证据目录。

## 允许改动范围
$taskFiles

## 禁止事项
- 禁止调用真实腾讯云、微信支付、线上数据库或生产域名。
- 禁止写入真实密钥、真实商户号、真实 openid、真实用户资料。
- 禁止用纯叙述代替截图、API trace、DB readback、视觉 metrics 或测试输出。
- 禁止跨任务大范围实现无关页面、接口或重构。
- 禁止隐藏失败；失败必须写入 result JSON 和 HANDOFF。

## 验收标准
- 当前任务主验收面 $taskSurface 已实现或已验证。
- 所有相关页面跳转、接口调用、数据库断言、失败修复要求和输出证据都有文件路径。
- 本地模拟边界被证明，没有真实云/支付/线上 DB 访问。

## 开发标准引用
- `docs/auto-execute/scoremap-development-standard.md` 的 Non-negotiable rules、Frontend rules、Backend/API rules、Database rules、Forbidden actions。

## 测试标准引用
- `docs/auto-execute/scoremap-software-test-standard.md` 的 Frontend page standard、Visual one-to-one standard、Backend/API standard、Database standard、Owner journey standard、Local-only safety standard。

## 细化验收标准
- 功能：覆盖 PRD 对应章节和矩阵中映射到本任务的 P0/P1 要求。
- 页面跳转：每个可点击控件必须断言目标 route、modal、toast、disabled reason 或 API 行为。
- 接口调用：记录 method、path、payload 摘要、响应状态、错误分支。
- 数据库断言：每个业务副作用必须做本地 DB mutation 与 readback；只读接口必须做查询结果断言。
- UI：页面任务必须输出 reference/actual/diff/metrics 或明确 `PASS_NEEDS_MANUAL_UI_REVIEW`。
- 安全：支付和云能力只能走本地 mock adapter；日志不得包含 secret。
- 失败修复：若测试失败，先本地修复并重跑；仍失败则输出 `REPAIR_REQUIRED` 和最小复现。

## 测试与证据
必跑命令：
~~~powershell
$($task.Tests)
~~~

证据输出：
- `docs/auto-execute/results/$($task.Id).json`
- `docs/auto-execute/latest/$($task.Id)-HANDOFF.md`
- `docs/auto-execute/evidence/$taskSurface/`

## 输出文件
- $taskFiles
- `docs/auto-execute/results/$($task.Id).json`
- `docs/auto-execute/latest/$($task.Id)-HANDOFF.md`

## 结果 JSON
`docs/auto-execute/results/$($task.Id).json`

JSON 至少包含：
~~~json
{
  "taskId": "$($task.Id)",
  "status": "PASS|REPAIR_REQUIRED|PASS_WITH_LIMITATION|PASS_NEEDS_MANUAL_UI_REVIEW|BLOCKED_BY_ENVIRONMENT|HARD_FAIL",
  "implementedFiles": [],
  "tests": [],
  "pageEvidence": [],
  "apiEvidence": [],
  "dbEvidence": [],
  "visualEvidence": [],
  "ownerJourneyEvidence": [],
  "localOnlyEvidence": [],
  "knownGaps": []
}
~~~

## HANDOFF
`docs/auto-execute/latest/$($task.Id)-HANDOFF.md`

必须写明：
- 已完成内容；
- 失败与修复记录；
- 测试命令和结果；
- 证据路径；
- 是否允许下一任务继续；
- 若非 PASS，下一个 task/repair 应优先处理什么。

## 失败状态
- `REPAIR_REQUIRED`：实现或证据失败但可本地修复。
- `PASS_WITH_LIMITATION`：非 P0 证据缺口，需说明限制。
- `PASS_NEEDS_MANUAL_UI_REVIEW`：截图/metrics 已生成但仍需人工视觉确认。
- `BLOCKED_BY_ENVIRONMENT`：本地工具缺失或运行环境不可用。
- `HARD_FAIL`：真实云/支付/线上 DB 被触发、密钥泄漏、或不可恢复失败。
"@
  Write-Utf8NoBom $taskPath $doc
  $promptSplitRows += "| $($task.Id) | $taskPath | $cmd |"
}

$split = @(
  "# scoremap codex exec prompts split",
  "",
  "Run each task in order. Do not merge tasks.",
  "",
  "| Task | Document | Paste-ready command |",
  "|---|---|---|",
  ($promptSplitRows -join "`n"),
  "",
  "Queue helper:",
  '~~~powershell',
  ('powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\xwstarmap-auto-execute\scripts\run-task-pack.ps1" -ProjectRoot "{0}" -TaskDir "{1}" -DryRun' -f $ProjectRoot, $taskDir),
  '~~~'
) -join "`n"
Write-Utf8NoBom (Join-Path $autoDir "$slug-codex-exec-prompts-split.md") $split

Write-Output "Generated scoremap task pack:"
Write-Output "  $autoDir"
Write-Output "  Tasks: $($tasks.Count)"
