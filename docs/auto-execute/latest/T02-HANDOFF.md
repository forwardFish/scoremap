# T02 HANDOFF

## Status
PASS_WITH_LIMITATION for the T02 local DB, Tencent Cloud mock, and local WeChat Pay mock adapter boundary.

T02 implemented backend adapters only. It did not implement T03+ HTTP product APIs, T06-T12 pages, T14 visual diff tooling, or T15 owner click journeys.

The literal PowerShell command `npm --prefix server test -- adapters local-db payment` is blocked on this host by the PowerShell execution policy for `npm.ps1` before project code runs. The equivalent Windows command form `npm.cmd --prefix server test -- adapters local-db payment` passed and executed the same server package test script.

## Completed
- Added a server-local test runner so the required command `npm --prefix server test -- adapters local-db payment` executes from the `server` boundary.
- Added `LocalJsonDbAdapter` for the required scoremap local tables:
  - `users`
  - `diagnosis_orders`
  - `upload_files`
  - `ai_analysis_tasks`
  - `diagnosis_decisions`
  - `payments`
  - `report_exports`
  - `feedbacks`
- Added `LocalTencentCloudMockAdapter` that writes upload bytes to local disk, records `upload_files`, returns local mock file IDs, and keeps `remoteCalls=[]`.
- Added `LocalWechatPayMockAdapter` that creates pending mock payments, returns local mock payment params, handles paid/failed/cancelled callbacks, and treats duplicate paid callbacks idempotently.
- Added adapter tests that write evidence under `docs/auto-execute/evidence/backend-adapters/`.

## Validation
Required command attempted:

```powershell
npm --prefix server test -- adapters local-db payment
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked npm.ps1 before project code ran.
```

Equivalent command run:

```powershell
npm.cmd --prefix server test -- adapters local-db payment
```

Observed result:

```text
5 tests passed, 0 failed
```

## Evidence Paths
- DB mutation/readback: `docs/auto-execute/evidence/backend-adapters/local-db-readback.json`
- Local Tencent Cloud mock proof: `docs/auto-execute/evidence/backend-adapters/local-cloud-mock.json`
- Local WeChat Pay mock proof: `docs/auto-execute/evidence/backend-adapters/local-payment-mock.json`
- Local-only and secret guard proof: `docs/auto-execute/evidence/backend-adapters/local-only-secret-guard.json`
- Page/visual/owner scope limitation proof: `docs/auto-execute/evidence/backend-adapters/scope-limitations.json`
- Command limitation and equivalent rerun proof: `docs/auto-execute/evidence/backend-adapters/test-command-summary.json`
- Result JSON: `docs/auto-execute/results/T02.json`

## Failures And Repairs
- Environment limitation: the literal `npm` PowerShell command is blocked by the host execution policy before project code runs.
- Equivalent rerun: `npm.cmd --prefix server test -- adapters local-db payment` passed with 5 tests and 0 failures.

## Local-Only Safety
- Tests set `LOCAL_ONLY=true` and `SCOREMAP_ADAPTER_MODE=local-mock`.
- Payment adapter is `local-wechat-pay-mock`.
- Cloud/storage adapter is `local-tencent-cloud-mock`.
- DB adapter is local JSON file backed.
- T02 adapter files were scanned for forbidden remote call patterns; findings were empty.
- No real Tencent Cloud, WeChat Pay, online DB, production domain, or credential call was made.

## Next Task Permission
T02 permits the next lexical task, T03, to continue as a separate task boundary.

T03 should use these adapters to implement order, upload, and preview APIs. It must not replace the T02 evidence or merge T04+ payment route work unless its own task document explicitly allows it.
