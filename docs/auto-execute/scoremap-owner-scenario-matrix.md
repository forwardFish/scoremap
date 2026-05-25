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