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