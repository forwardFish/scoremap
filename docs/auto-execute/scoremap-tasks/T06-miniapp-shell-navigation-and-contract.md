# Task T06 - 小程序壳、路由、接口契约

## Codex Exec
~~~powershell
Set-Location -LiteralPath 'D:\lyh\agent\agent-frame\scoremap'; codex exec "Use the auto-execute skill. Execute only this task document: D:\lyh\agent\agent-frame\scoremap\docs\auto-execute\scoremap-tasks\T06-miniapp-shell-navigation-and-contract.md. Treat this as one fresh task boundary; do not merge adjacent tasks. Follow the scoremap auto-execute master plan, requirement traceability matrix, UI reference map, API/DB contract matrix, standard test plan, owner scenario matrix, and final gate. Use local data and local mock adapters only. Do not call Tencent Cloud, WeChat Pay, or any online database. Implement this task, run its tests, write result JSON and HANDOFF with evidence paths. Do not claim PASS without page, API, DB, route, visual, or owner evidence required by this task."
~~~

## 实现功能
建立小程序页面壳、底部 Tab、API client、fixture 注入、路由守卫、状态到页面跳转表；页面不可接真实生产 API。

## 必须读取的输入
项目根目录：D:\lyh\agent\agent-frame\scoremap
需求文档：D:\lyh\agent\agent-frame\scoremap\docs\AI提分决策_PRD_MVP_v1.2_C端页面流程修订版.md
UI 目录：D:\lyh\agent\agent-frame\scoremap\docs\UI\小程序
Stitch UI 代码目录：D:\lyh\agent\agent-frame\scoremap\docs\UI\小程序\stitch_codex_development_blueprints
参考项目：D:\lyh\agent\agent-frame\printersheet
强制策略：所有测试、支付、云、数据库均使用本地数据和本地模拟适配器；禁止真实调用腾讯云、微信支付或线上数据库。

还必须读取：
- docs/auto-execute/scoremap-auto-execute-master-plan.md
- docs/auto-execute/scoremap-development-standard.md
- docs/auto-execute/scoremap-software-test-standard.md
- docs/auto-execute/scoremap-requirement-traceability-matrix.md
- docs/auto-execute/scoremap-ui-reference-map.md
- docs/auto-execute/scoremap-api-db-contract-matrix.md
- docs/auto-execute/scoremap-standard-test-plan.md
- docs/auto-execute/scoremap-owner-scenario-matrix.md
- 当前任务相关的源码、测试、证据目录。

## 允许改动范围
scoremap-miniapp/app.*, scoremap-miniapp/pages/**, scoremap-miniapp/services/**, scoremap-miniapp/utils/**

## 禁止事项
- 禁止调用真实腾讯云、微信支付、线上数据库或生产域名。
- 禁止写入真实密钥、真实商户号、真实 openid、真实用户资料。
- 禁止用纯叙述代替截图、API trace、DB readback、视觉 metrics 或测试输出。
- 禁止跨任务大范围实现无关页面、接口或重构。
- 禁止隐藏失败；失败必须写入 result JSON 和 HANDOFF。

## 验收标准
- 当前任务主验收面 frontend-shell 已实现或已验证。
- 所有相关页面跳转、接口调用、数据库断言、失败修复要求和输出证据都有文件路径。
- 本地模拟边界被证明，没有真实云/支付/线上 DB 访问。

## 开发标准引用
- docs/auto-execute/scoremap-development-standard.md 的 Non-negotiable rules、Frontend rules、Backend/API rules、Database rules、Forbidden actions。

## 测试标准引用
- docs/auto-execute/scoremap-software-test-standard.md 的 Frontend page standard、Visual one-to-one standard、Backend/API standard、Database standard、Owner journey standard、Local-only safety standard。

## 细化验收标准
- 功能：覆盖 PRD 对应章节和矩阵中映射到本任务的 P0/P1 要求。
- 页面跳转：每个可点击控件必须断言目标 route、modal、toast、disabled reason 或 API 行为。
- 接口调用：记录 method、path、payload 摘要、响应状态、错误分支。
- 数据库断言：每个业务副作用必须做本地 DB mutation 与 readback；只读接口必须做查询结果断言。
- UI：页面任务必须输出 reference/actual/diff/metrics 或明确 PASS_NEEDS_MANUAL_UI_REVIEW。
- 安全：支付和云能力只能走本地 mock adapter；日志不得包含 secret。
- 失败修复：若测试失败，先本地修复并重跑；仍失败则输出 REPAIR_REQUIRED 和最小复现。

## 测试与证据
必跑命令：
~~~powershell
npm test -- miniapp-shell; npm run lint --if-present
~~~

证据输出：
- docs/auto-execute/results/T06.json
- docs/auto-execute/latest/T06-HANDOFF.md
- docs/auto-execute/evidence/frontend-shell/

## 输出文件
- scoremap-miniapp/app.*, scoremap-miniapp/pages/**, scoremap-miniapp/services/**, scoremap-miniapp/utils/**
- docs/auto-execute/results/T06.json
- docs/auto-execute/latest/T06-HANDOFF.md

## 结果 JSON
docs/auto-execute/results/T06.json

JSON 至少包含：
~~~json
{
  "taskId": "T06",
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
docs/auto-execute/latest/T06-HANDOFF.md

必须写明：
- 已完成内容；
- 失败与修复记录；
- 测试命令和结果；
- 证据路径；
- 是否允许下一任务继续；
- 若非 PASS，下一个 task/repair 应优先处理什么。

## 失败状态
- REPAIR_REQUIRED：实现或证据失败但可本地修复。
- PASS_WITH_LIMITATION：非 P0 证据缺口，需说明限制。
- PASS_NEEDS_MANUAL_UI_REVIEW：截图/metrics 已生成但仍需人工视觉确认。
- BLOCKED_BY_ENVIRONMENT：本地工具缺失或运行环境不可用。
- HARD_FAIL：真实云/支付/线上 DB 被触发、密钥泄漏、或不可恢复失败。