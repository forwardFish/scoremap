# T03 HANDOFF

## Status
PASS_WITH_LIMITATION for the T03 backend diagnosis-order, upload, preview-analysis, progress, and preview-decision API boundary.

The backend API behavior is implemented and verified with local JSON DB plus local Tencent Cloud mock storage only. Pure PASS is not claimed because frontend screenshots, visual diff metrics, and exact owner click traces are intentionally assigned to later tasks.

## Completed
- Added `DiagnosisOrdersService` for:
  - `POST /api/diagnosis-orders`
  - `POST /api/diagnosis-orders/{orderId}/uploads`
  - `POST /api/diagnosis-orders/{orderId}/start-preview-analysis`
  - `GET /api/diagnosis-orders/{orderId}/analysis-progress`
  - `GET /api/diagnosis-orders/{orderId}/preview-decision`
- Added a diagnosis-order router that tests can mount on a local `127.0.0.1` HTTP server.
- Added T03 integration tests for success, validation failure, owner/token denial, low-quality image failure, timeout branch, DB readback, and local-only guard.
- Updated the local server test runner so `orders uploads preview` selects the T03 test file without rerunning unrelated tests.

## Validation
Required command attempted:

```powershell
npm --prefix server test -- orders uploads preview
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked npm.ps1 before project code ran.
```

Equivalent command run:

```powershell
npm.cmd --prefix server test -- orders uploads preview
```

Observed result:

```text
4 tests passed, 0 failed
```

Regression command run:

```powershell
npm.cmd --prefix server test -- adapters local-db payment
```

Observed result:

```text
5 tests passed, 0 failed
```

## Evidence Paths
- API success, page-route expectation, DB mutation/readback, and local mock storage: `docs/auto-execute/evidence/backend-api/orders-uploads-preview-success.json`
- Validation and ownership errors: `docs/auto-execute/evidence/backend-api/validation-auth-errors.json`
- Low-quality and timeout failure branches: `docs/auto-execute/evidence/backend-api/failure-branches.json`
- Local-only, forbidden remote scan, visual limitation, and owner limitation: `docs/auto-execute/evidence/backend-api/local-only-secret-guard.json`
- Result JSON: `docs/auto-execute/results/T03.json`

## Failures And Repairs
- Environment limitation: the literal `npm` PowerShell command is blocked by host execution policy before project code runs.
- Equivalent rerun: `npm.cmd --prefix server test -- orders uploads preview` passed with 4 tests and 0 failures.
- Repair during attempt 1: T03 mock response text was changed to ASCII-safe copy after PowerShell JSON validation exposed host encoding issues in generated evidence.
- Repair during attempt 1: the local test runner now uses `--test-concurrency=1` so the HTTP fixture tests run deterministically in one local process.
- No task-caused test failures remained after repair and rerun.

## Local-Only Safety
- Tests set `LOCAL_ONLY=true` and `SCOREMAP_ADAPTER_MODE=local-mock`.
- Uploads go through `local-tencent-cloud-mock` into local temp storage.
- DB mutations use the local JSON DB adapter.
- Evidence records `remoteCalls=[]`.
- T03 source and test files were scanned for forbidden remote endpoint patterns; findings were empty.
- No Tencent Cloud, WeChat Pay, online DB, production domain, real merchant ID, real openid, or secret was used.

## Next Task Permission
T03 permits the next lexical task, T04, to continue as a separate task boundary.

T04 should build payment and entitlement APIs on top of the T02 payment adapter and the T03 order state. It should not replace T03 evidence or merge T05+ report APIs unless its own task document explicitly allows it.
