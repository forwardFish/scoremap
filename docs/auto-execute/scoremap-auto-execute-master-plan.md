# scoremap auto-execute master plan

## Source of truth
项目根目录：D:\lyh\agent\agent-frame\scoremap
需求文档：D:\lyh\agent\agent-frame\scoremap\docs\AI提分决策_PRD_MVP_v1.2_C端页面流程修订版.md
UI 目录：D:\lyh\agent\agent-frame\scoremap\docs\UI\小程序
Stitch UI 代码目录：D:\lyh\agent\agent-frame\scoremap\docs\UI\小程序\stitch_codex_development_blueprints
参考项目：D:\lyh\agent\agent-frame\printersheet
强制策略：所有测试、支付、云、数据库均使用本地数据和本地模拟适配器；禁止真实调用腾讯云、微信支付或线上数据库。

## Execution contract
One task document equals one fresh codex exec boundary. Run tasks in lexical order from docs/auto-execute/scoremap-tasks. A task may implement only its declared surface and must write:

- docs/auto-execute/results/<TASK-ID>.json
- docs/auto-execute/latest/<TASK-ID>-HANDOFF.md
- evidence under docs/auto-execute/evidence/<surface>/

## Local-only safety
- LOCAL_ONLY=true is mandatory.
- Payment must use a local WeChat Pay mock; no real payment request, callback signing against production, merchant credential, or Tencent endpoint is allowed.
- Tencent CloudBase/storage/database must use local mock adapters.
- Online database URLs, production domains, and cloud secrets are forbidden in tests.
- Final gate fails closed if any log shows a real cloud/payment/online DB call.

## Task table
| Task | Name | Surface | Required verification | Result JSON | Status |
|---|---|---|---|---|---|
| T00 | 证据盘点与验收框架 | documentation+harness | powershell -ExecutionPolicy Bypass -File scripts/acceptance/check-report-integrity.ps1 | docs/auto-execute/results/T00.json | PLANNED |
| T01 | 本地全栈脚手架 | scaffold | npm install; npm test; npm run build --if-present | docs/auto-execute/results/T01.json | PLANNED |
| T02 | 本地数据库、腾讯云、本地支付适配器 | backend-adapters | npm --prefix server test -- adapters local-db payment | docs/auto-execute/results/T02.json | PLANNED |
| T03 | 订单、上传、初判预览 API | backend-api | npm --prefix server test -- orders uploads preview | docs/auto-execute/results/T03.json | PLANNED |
| T04 | 1 元与 9.9 元本地支付闭环 | backend-api-payment | npm --prefix server test -- payment entitlement | docs/auto-execute/results/T04.json | PLANNED |
| T05 | 完整报告、PDF、反馈、数据导出 API | backend-api-report | npm --prefix server test -- report feedback export | docs/auto-execute/results/T05.json | PLANNED |
| T06 | 小程序壳、路由、接口契约 | frontend-shell | npm test -- miniapp-shell; npm run lint --if-present | docs/auto-execute/results/T06.json | PLANNED |
| T07 | C01 首页与 C02 上传授权 | frontend-page | npm test -- home-upload; npm run visual:scoremap -- home | docs/auto-execute/results/T07.json | PLANNED |
| T08 | C03 AI 分析中与 C04 处理失败 | frontend-page | npm test -- analysis-failure; npm run visual:scoremap -- analysis failure | docs/auto-execute/results/T08.json | PLANNED |
| T09 | C05 初判预览与 C06 1 元确认 | frontend-page | npm test -- preview-basic-pay; npm run visual:scoremap -- preview basic-pay | docs/auto-execute/results/T09.json | PLANNED |
| T10 | C07 AI 初判结果与 C08 解锁完整分析 | frontend-page | npm test -- basic-result-full-unlock; npm run visual:scoremap -- basic-result full-unlock | docs/auto-execute/results/T10.json | PLANNED |
| T11 | C09 完整提分报告入口与 C10 PDF 式报告 | frontend-page | npm test -- full-report-pdf; npm run visual:scoremap -- full-report-entry full-report | docs/auto-execute/results/T11.json | PLANNED |
| T12 | C11 我的与 C12 我的报告列表 | frontend-page | npm test -- my-reports-feedback; npm run visual:scoremap -- my reports | docs/auto-execute/results/T12.json | PLANNED |
| T13 | 权限、状态机、支付恢复 | contract-security | npm --prefix server test -- auth recovery errors | docs/auto-execute/results/T13.json | PLANNED |
| T14 | 页面一比一复刻对比工具 | visual-harness | npm --prefix tools/ui-visual test; npm run visual:scoremap -- all | docs/auto-execute/results/T14.json | PLANNED |
| T15 | 家长全流程点击验收 | e2e-owner | npm run e2e:owner | docs/auto-execute/results/T15.json | PLANNED |
| T16 | 接口调用与数据库断言 E2E | api-db-e2e | npm run e2e:api-db | docs/auto-execute/results/T16.json | PLANNED |
| T17 | 本地模拟边界与密钥防护 | safety | powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-local-only-guard.ps1; powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-secret-guard.ps1 | docs/auto-execute/results/T17.json | PLANNED |
| T18 | 最终验收闸门 | final-gate | powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-final-gate.ps1 | docs/auto-execute/results/T18.json | PLANNED |

## Final PASS conditions
Pure PASS requires evidence for every P0 page, API, DB mutation/readback, UI comparison, local-only safety guard, and parent owner journey. Missing screenshots, missing route/API/DB trace, missing visual metrics, missing result JSON, or any task status of REPAIR_REQUIRED, HARD_FAIL, or BLOCKED_BY_MISSING_SOURCE prevents pure PASS.

## Known blockers at pack generation
- The repo currently has no product source code, so T01 must create the local full-stack scaffold before implementation tasks can run.
- UI blueprints use external image URLs in HTML; implementation tasks must replace them with local assets, bundled placeholders, or documented deterministic mocks.
- Real WeChat/Tencent/online DB evidence is intentionally out of scope and forbidden.