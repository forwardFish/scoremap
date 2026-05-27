# Scoremap UI one-to-one repair master

## Goal

Undo the incorrect generic card-page repair and rebuild the Scoremap miniapp UI as code-based WXML/WXSS replicas of the references under `docs/UI/小程序/**/code.html` plus the matching `screen.png` or named PNG files.

This task pack covers UI one-to-one repair only. It must not mix in the v1.3 backend, DB, payment, LLM, or API expansion tasks from the existing T19-T33 pack.

## Required visual screens

The repair target has 15 required visual screens. `full-report` has two states on the same route: the old report state and the v1.3 AI tutor state.

| Group | Screen | Route/state | Primary reference |
| --- | --- | --- | --- |
| Old flow | home | `/pages/index/index` | `docs/UI/小程序/stitch_codex_development_blueprints/ai_2/code.html`, `screen.png`, `首页.png` |
| Old flow | analysis | `/pages/analysis/index` | `docs/UI/小程序/stitch_codex_development_blueprints/ai_1/code.html`, `screen.png`, `AI分析.png` |
| Old flow | failure | `/pages/failure/index` | `docs/UI/小程序/stitch_codex_development_blueprints/_3/code.html`, `screen.png`, `处理失败.png` |
| Old flow | preview | `/pages/preview/index` | `docs/UI/小程序/分析报告.png` and matching code surface from the old UI reference map |
| Old flow | basic-pay | `/pages/basic-pay/index` | `docs/UI/小程序/stitch_codex_development_blueprints/1/code.html`, `screen.png`, `1元支付.png` |
| Old flow | basic-result | `/pages/basic-result/index` | `docs/UI/小程序/完整初判结果*` references and mapped code surface |
| Old flow | full-unlock | `/pages/full-unlock/index` | `docs/UI/小程序/stitch_codex_development_blueprints/_4/code.html`, `screen.png` |
| Old flow | full-report-entry | `/pages/full-report-entry/index` | `docs/UI/小程序/stitch_codex_development_blueprints/_2/code.html`, `screen.png`, `完整提分报告.png` |
| Old flow | full-report old | `/pages/full-report/index` old state | `docs/UI/小程序/stitch_codex_development_blueprints/ai_pdf/code.html`, `screen.png` |
| Old flow | my | `/pages/my/index` | `docs/UI/小程序/stitch_codex_development_blueprints/_1/code.html`, `screen.png`, `我的.png` |
| v1.3 | full-report v1.3 | `/pages/full-report/index` v1.3 state | `docs/UI/小程序/stitch_codex_ui_design_kit/_3/code.html`, `screen.png` |
| v1.3 | wrong-question | `/pages/wrong-question/index` | `docs/UI/小程序/stitch_codex_ui_design_kit/_1/code.html`, `screen.png` |
| v1.3 | ai-tutor | `/pages/ai-tutor/index` | `docs/UI/小程序/stitch_codex_ui_design_kit/ai/code.html`, `screen.png` |
| v1.3 | ai-exercise | `/pages/ai-exercise/index` | `docs/UI/小程序/stitch_codex_ui_design_kit/_4/code.html`, `screen.png` |
| v1.3 | ai-exercise-feedback | `/pages/ai-exercise-feedback/index` | `docs/UI/小程序/stitch_codex_ui_design_kit/_2/code.html`, `screen.png` |

## Supporting code pages

`reports`, `orders`, `feedback`, and `scaffold` are supporting pages. They must be normal code-rendered pages in the same visual language, with working route state and click behavior. They must not claim independent pixel-reference parity because no standalone reference screenshot is assigned to them in this pack.

## Hard rules

- Do not mount a full-page screenshot or reference PNG as the UI.
- Do not use remote CDN, remote fonts, remote images, production cloud, real payment, real model providers, or secrets.
- Do not draw another generic card shell and call it a replica.
- Do not break the existing route, API, DB, navigation, tab, or owner-click behavior.
- Preserve local/mock boundaries for payment, cloud, AI, and data.
- Keep all user-visible UI as WXML/WXSS code and local deterministic assets.
- Keep full-report old and full-report v1.3 states distinguishable in evidence.
- Treat screenshot/diff evidence as stronger than structural evidence; if real pixel diff is unavailable, do not claim pure `PASS`.

## Exit standard

The final UI gate must run and record:

- `npm test`
- `npm run e2e:owner`
- `npm run visual:scoremap`
- `npm run build`
- `git diff --check`

T43 must also run `powershell -ExecutionPolicy Bypass -File .\scripts\acceptance\run-final-gate.ps1` with the relevant Scoremap scope. If complete pixel-diff evidence is unavailable, the strongest honest final status is `PASS_NEEDS_MANUAL_UI_REVIEW`; otherwise use `REPAIR_REQUIRED`, `BLOCKED_BY_ENVIRONMENT`, or a stricter non-pass status as evidence requires.

## Task boundary

Tasks T34 through T43 are independent Relay-style workers. Each task must run in one fresh `codex exec`, write `docs/auto-execute/results/<TASK-ID>.json`, write `docs/auto-execute/latest/<TASK-ID>-HANDOFF.md`, and exit. A worker must not start the next task.
