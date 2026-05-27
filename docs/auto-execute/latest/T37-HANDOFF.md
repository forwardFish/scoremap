# T37 Handoff

Status: PASS_WITH_LIMITATION

## Result

Rebuilt `preview`, `basic-pay`, and `basic-result` as page-specific WXML/WXSS replicas for the old 1 yuan unlock flow.

## Changed

- `scoremap-miniapp/pages/preview/index.wxml`
- `scoremap-miniapp/pages/preview/index.wxss`
- `scoremap-miniapp/pages/basic-pay/index.wxml`
- `scoremap-miniapp/pages/basic-pay/index.wxss`
- `scoremap-miniapp/pages/basic-pay/index.js`
- `scoremap-miniapp/pages/basic-result/index.wxml`
- `scoremap-miniapp/pages/basic-result/index.wxss`
- `scoremap-miniapp/pages/basic-result/index.js`
- `docs/auto-execute/results/T37.json`

## Verification

- PASS: `npm test -- preview-basic-pay`
- PASS: `npm test -- basic-result-full-unlock`
- PASS: `npm --prefix server test -- payment`
- PASS: `npm run e2e:owner -- old-flow-preview-payment-result`
- PASS_NEEDS_MANUAL_UI_REVIEW: `npm run visual:scoremap -- preview basic-pay basic-result`
- FAIL: `npm test -- preview-basic-pay basic-result-full-unlock payment-api`

The combined npm test command fails because `scripts/run-tests.mjs` requires every provided selector to be present on the same test group. The same required coverage passed when run through the matching repo groups.

## Evidence

- `docs/auto-execute/results/T37.json`
- `docs/auto-execute/evidence/frontend-page/preview-basic-pay-route-controls.json`
- `docs/auto-execute/evidence/frontend-page/preview-basic-pay-api-db.json`
- `docs/auto-execute/evidence/frontend-page/basic-result-full-unlock-route-controls.json`
- `docs/auto-execute/evidence/frontend-page/basic-result-full-unlock-api-db.json`
- `docs/auto-execute/evidence/frontend-page/visual/preview/summary-preview.json`
- `docs/auto-execute/evidence/frontend-page/visual/basic-pay/summary-basic-pay.json`
- `docs/auto-execute/evidence/frontend-page/visual/basic-result/summary-basic-result.json`

## Remaining Risk

No task-caused red behavior gate remains. Pure visual pixel-perfect PASS is not claimed because the local harness produces structural artifacts and manual-review diffs, not live WeChat raster pixelmatch.
