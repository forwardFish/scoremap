# T09 HANDOFF

## Status
PASS_NEEDS_MANUAL_UI_REVIEW for the C05 initial decision preview and C06 1 yuan basic payment confirmation boundary.

Pure PASS is not claimed because T09 produced deterministic structural visual actual/diff/metrics evidence, but did not run pixel-perfect screenshot comparison against `docs/UI/小程序/分析报告.png`, `docs/UI/小程序/1元支付.png`, or Stitch `stitch_codex_development_blueprints/1/screen.png`. The full visual harness remains assigned to T14, and full owner E2E remains assigned to T15.

## Completed
- Implemented the preview page state in `scoremap-miniapp/pages/preview/index.js`.
- Implemented the basic payment confirmation page state in `scoremap-miniapp/pages/basic-pay/index.js`.
- Preview now loads local `GET /api/diagnosis-orders/{orderId}/preview-decision`, displays no more than 3 visible modules, shows a locked area, and routes the 1 yuan CTA to `/pages/basic-pay/index`.
- Basic pay now shows a 3-step confirmation flow, report summary, locked modules, and a payment button whose copy says `完整初判`, not `完整报告`.
- Basic pay uses local mock payment creation, local mock callback, basic decision readback, payment/order/decision DB readback, and routes to `/pages/basic-result/index` after local mock success.
- Added selector-aware `npm test -- preview-basic-pay` support.
- Added local `visual:scoremap -- preview basic-pay` evidence writer that emits reference/actual/diff/metrics artifacts without claiming pixel-perfect PASS.

## Validation
Required command attempted:

```powershell
npm test -- preview-basic-pay
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked C:\Program Files\nodejs\npm.ps1 before project code ran.
```

Equivalent required command run:

```powershell
npm.cmd test -- preview-basic-pay
```

Observed result:

```text
3 tests passed, 0 failed
```

Required visual command attempted:

```powershell
npm run visual:scoremap -- preview basic-pay
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked C:\Program Files\nodejs\npm.ps1 before project code ran.
```

Equivalent visual command run:

```powershell
npm.cmd run visual:scoremap -- preview basic-pay
```

Observed result:

```text
T09 visual evidence written to docs\auto-execute\evidence\frontend-page\visual\preview\summary-preview.json and docs\auto-execute\evidence\frontend-page\visual\basic-pay\summary-basic-pay.json
```

Additional regression checks:

```powershell
npm.cmd test -- miniapp-shell
npm.cmd test -- home-upload
npm.cmd test -- analysis-failure
npm.cmd run build
node -e "parse T09 evidence json"
```

Observed result:

```text
miniapp-shell: 4 tests passed, 0 failed
home-upload: 3 tests passed, 0 failed
analysis-failure: 3 tests passed, 0 failed
build: T01 local runtime scaffold build PASS
T09 evidence JSON parse: PASS
```

## Evidence Paths
- Page jump and clickable controls: `docs/auto-execute/evidence/frontend-page/preview-basic-pay-route-controls.json`
- API calls, payment callback, basic decision, and DB readback: `docs/auto-execute/evidence/frontend-page/preview-basic-pay-api-db.json`
- Owner journey, visual limitation, and local-only guard: `docs/auto-execute/evidence/frontend-page/preview-basic-pay-owner-local.json`
- Preview visual actual artifact: `docs/auto-execute/evidence/frontend-page/visual/preview/actual-preview-structure.svg`
- Preview visual diff/manual-review artifact: `docs/auto-execute/evidence/frontend-page/visual/preview/diff-preview-manual-review.svg`
- Preview visual metrics: `docs/auto-execute/evidence/frontend-page/visual/preview/metrics-preview.json`
- Preview visual summary: `docs/auto-execute/evidence/frontend-page/visual/preview/summary-preview.json`
- Basic-pay visual actual artifact: `docs/auto-execute/evidence/frontend-page/visual/basic-pay/actual-basic-pay-structure.svg`
- Basic-pay visual diff/manual-review artifact: `docs/auto-execute/evidence/frontend-page/visual/basic-pay/diff-basic-pay-manual-review.svg`
- Basic-pay visual metrics: `docs/auto-execute/evidence/frontend-page/visual/basic-pay/metrics-basic-pay.json`
- Basic-pay visual summary: `docs/auto-execute/evidence/frontend-page/visual/basic-pay/summary-basic-pay.json`
- Result JSON: `docs/auto-execute/results/T09.json`

## Failures And Repairs
- Repaired the root test command boundary by adding selector-aware test dispatch for `preview-basic-pay`.
- Repaired the local visual command boundary by dispatching `preview basic-pay` to the T09 structural evidence writer.
- Added local mock callback support to the miniapp API client so T09 can prove `POST /api/payments/wechat/callback` and read back payment/order/basic decision state without real payment calls.
- No T09 focused test failure remains.
- Host PowerShell still blocks `npm.ps1`; `npm.cmd` was used as the equivalent command and passed.

## Local-Only Safety
- Tests assert `LOCAL_ONLY=true` and `SCOREMAP_ADAPTER_MODE=local-mock`.
- Payment create and callback use `local-wechat-pay-mock` only.
- Miniapp persistence uses the local fixture store only.
- Forbidden remote scan found no Tencent Cloud, WeChat Pay, online DB, production domain, or secret usage in T09 files/evidence.

## Next Task Permission
T09 permits the next lexical task, T10, to continue as a separate task boundary.

T10 should build C07/C08 basic result and full unlock without expanding T09. T14 should later replace the T09 manual visual limitation with real screenshot/pixel-diff evidence.
