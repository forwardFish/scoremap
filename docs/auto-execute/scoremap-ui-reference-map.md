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