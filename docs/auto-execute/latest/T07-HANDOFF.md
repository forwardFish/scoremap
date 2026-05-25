# T07 HANDOFF

## Status
PASS_NEEDS_MANUAL_UI_REVIEW for the C01 home and C02 upload authorization boundary.

Pure PASS is not claimed because T07 produced deterministic structural visual actual/diff/metrics evidence, but not a pixel-perfect screenshot comparison against `docs/UI/小程序/首页.png` and Stitch `ai_2/screen.png`. The full visual harness remains assigned to T14, and the full owner E2E remains assigned to T15.

## Completed
- Implemented the home/upload page state in `scoremap-miniapp/pages/index/index.js`.
- Added the upload authorization modal flow before local file selection.
- Added local order creation, upload authorization persistence, preview-analysis start, recent reports loading, sample entry, my reports entry, and bottom tab metadata.
- Added selector-aware `npm test -- home-upload` support through `scripts/run-tests.mjs`, so the required T07 command no longer runs unrelated server suites.
- Added a local `visual:scoremap -- home` evidence writer that emits reference/actual/diff/metrics artifacts without claiming pixel-perfect PASS.

## Validation
Required command attempted:

```powershell
npm test -- home-upload
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked C:\Program Files\nodejs\npm.ps1 before project code ran.
```

Equivalent required command run:

```powershell
npm.cmd test -- home-upload
```

Observed result:

```text
3 tests passed, 0 failed
```

Required visual command run:

```powershell
npm run visual:scoremap -- home
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked C:\Program Files\nodejs\npm.ps1 before project code ran.
```

Equivalent visual command run:

```powershell
npm.cmd run visual:scoremap -- home
```

Observed result:

```text
T07 home visual evidence written to docs\auto-execute\evidence\frontend-page\visual\home\summary-home.json
```

Additional regression checks:

```powershell
npm.cmd test -- miniapp-shell
npm.cmd run build
```

Observed result:

```text
miniapp-shell: 4 tests passed, 0 failed
build: T01 local runtime scaffold build PASS
```

## Evidence Paths
- Page jump and clickable controls: `docs/auto-execute/evidence/frontend-page/home-page-route-controls.json`
- API calls and DB readback: `docs/auto-execute/evidence/frontend-page/home-upload-api-db.json`
- Owner/local-only/visual limitation evidence: `docs/auto-execute/evidence/frontend-page/home-upload-owner-local.json`
- Visual actual artifact: `docs/auto-execute/evidence/frontend-page/visual/home/actual-home-structure.svg`
- Visual diff/manual-review artifact: `docs/auto-execute/evidence/frontend-page/visual/home/diff-home-manual-review.svg`
- Visual metrics: `docs/auto-execute/evidence/frontend-page/visual/home/metrics-home.json`
- Visual summary: `docs/auto-execute/evidence/frontend-page/visual/home/summary-home.json`
- Result JSON: `docs/auto-execute/results/T07.json`

## Failures And Repairs
- Repaired the root test command boundary by adding selector-aware test dispatch for `home-upload`.
- No T07 focused test failure remains.
- Host PowerShell still blocks `npm.ps1`; `npm.cmd` was used as the equivalent command and passed.

## Local-Only Safety
- Tests assert `LOCAL_ONLY=true` and `SCOREMAP_ADAPTER_MODE=local-mock`.
- Upload/order/report-list behavior uses the miniapp local fixture API client and in-memory store only.
- Forbidden remote scan found no Tencent Cloud, WeChat Pay, online DB, production domain, or secret usage in T07 files/evidence.

## Next Task Permission
T07 permits the next lexical task, T08, to continue as a separate task boundary.

T08 should build C03/C04 analysis and failure pages without expanding T07. T14 should later replace the T07 manual visual limitation with real screenshot/pixel-diff evidence.
