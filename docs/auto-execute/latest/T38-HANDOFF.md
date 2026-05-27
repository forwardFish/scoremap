# T38 Handoff

Status: `PASS_WITH_LIMITATION`

## Completed

- Rebuilt `scoremap-miniapp/pages/full-unlock/index.wxml` and `index.wxss` as the old-flow unlock surface: header/back affordance, basic-analysis hero, four locked benefits, 9.9 yuan price panel, local mock/compliance assurance, pay CTA, and decline path.
- Rebuilt `scoremap-miniapp/pages/full-report-entry/index.wxml` and `index.wxss` as the old-flow complete-report entry: generated hero, four report rows, view/save/home actions.
- Rebuilt `scoremap-miniapp/pages/my/index.wxml` and `index.wxss` as the old-flow profile/menu/tab surface while retaining reports, purchases, orders, feedback, new analysis, and bottom-tab behavior.
- Updated miniapp Page-branch action maps for `full-unlock` back and `my` purchases/copy actions. The Node service/page-state bindings for report, order, feedback, payment, save, and home behavior were preserved.

## Verification

- `npm test -- full-report-pdf my-reports-feedback basic-result-full-unlock`: failed before and after implementation because the repo test runner requires all selectors to match one test group.
- `npm.cmd test -- full-report-pdf`: PASS, 3/3.
- `npm.cmd test -- my-reports-feedback`: PASS, 3/3.
- `npm.cmd test -- basic-result-full-unlock`: PASS, 3/3.
- `npm.cmd run e2e:owner -- old-flow-full-unlock-entry-my`: PASS, 2/2.
- `npm.cmd run visual:scoremap -- full-unlock full-report-entry my`: `PASS_NEEDS_MANUAL_UI_REVIEW`; harness wrote 6 comparisons because requested screens expand to paired structural runners.
- `git diff --check`: PASS with existing LF-to-CRLF warnings only.

## Evidence

- `docs/auto-execute/evidence/ui-one-to-one/T38/summary.json`
- `docs/auto-execute/results/T38.json`
- `docs/auto-execute/evidence/visual-harness/summary.json`
- Existing frontend evidence under `docs/auto-execute/evidence/frontend-page/*full-report-pdf*`, `*my-reports-feedback*`, and `*basic-result-full-unlock*`

## Limitations

- No pixel-perfect PASS is claimed; the current local visual harness reports structural evidence and manual-review diffs.
- The exact combined npm test command remains incompatible with `scripts/run-tests.mjs` selector semantics, and changing that runner is outside T38 allowed files.
