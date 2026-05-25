# T04 HANDOFF

## Status
PASS_WITH_LIMITATION for the T04 backend payment API and entitlement boundary.

The local HTTP payment APIs are implemented and verified with local JSON DB plus the local WeChat Pay mock adapter only. Pure PASS is not claimed because frontend screenshots, visual diff metrics, and exact owner click traces are assigned to later frontend, visual, and owner E2E tasks.

## Completed
- Added `PaymentsService` for:
  - `POST /api/payments/create`
  - `POST /api/payments/wechat/callback`
- Added `createPaymentsRouter` for the local HTTP API surface.
- Implemented local 1 CNY basic payment creation, idempotent create, paid callback, and basic entitlement readback.
- Implemented local 9.9 CNY full payment creation after basic entitlement, paid callback, and full entitlement readback.
- Implemented full-before-basic denial, request validation, owner denial, failed callback, cancelled callback, duplicate callback idempotency, local mock signature enforcement, and compensation repair for a paid callback whose order entitlement was not applied.
- Tightened `server/test/run-tests.js` so multi-tag commands select tests matching all requested tags; this keeps `payment entitlement`, `orders uploads preview`, and `adapters local-db payment` isolated.

## Validation
Required command attempted:

```powershell
npm --prefix server test -- payment entitlement
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked npm.ps1 before project code ran.
```

Equivalent command run:

```powershell
npm.cmd --prefix server test -- payment entitlement
```

Observed result:

```text
4 tests passed, 0 failed
```

Regression commands run:

```powershell
npm.cmd --prefix server test -- adapters local-db payment
npm.cmd --prefix server test -- orders uploads preview
```

Observed result:

```text
5 tests passed, 0 failed
4 tests passed, 0 failed
```

## Evidence Paths
- Basic payment API, page-route expectation, DB mutation/readback, idempotency, and local mock proof: `docs/auto-execute/evidence/backend-api-payment/basic-payment.json`
- Full payment API, prerequisite entitlement denial, DB mutation/readback, and local mock proof: `docs/auto-execute/evidence/backend-api-payment/full-payment.json`
- Validation, owner denial, failed, cancelled, and compensation repair branches: `docs/auto-execute/evidence/backend-api-payment/failure-recovery-branches.json`
- Local-only, forbidden remote scan, visual limitation, and owner limitation: `docs/auto-execute/evidence/backend-api-payment/local-only-secret-guard.json`
- Result JSON: `docs/auto-execute/results/T04.json`

## Failures And Repairs
- Environment limitation: the literal `npm` PowerShell command is blocked by host execution policy before project code runs.
- Equivalent rerun: `npm.cmd --prefix server test -- payment entitlement` passed with 4 tests and 0 failures.
- Repair during attempt 1: full payment before basic initially returned `409`; it now returns `403 BASIC_ENTITLEMENT_REQUIRED`.
- Repair during attempt 1: the shared test selector initially ran the older adapter suite for the T04 command because both used the `payment` tag; it now requires all requested tags to match, and T02/T03 regression commands still pass.

## Local-Only Safety
- Tests set `LOCAL_ONLY=true` and `SCOREMAP_ADAPTER_MODE=local-mock`.
- Payment behavior uses `local-wechat-pay-mock`.
- DB mutations use the local JSON DB adapter.
- Evidence records `remoteCalls=[]`.
- T04 source and test files were scanned for forbidden remote endpoint patterns; findings were empty.
- No Tencent Cloud, WeChat Pay, online DB, production domain, real merchant ID, real openid, or secret was used.

## Next Task Permission
T04 permits the next lexical task, T05, to continue as a separate task boundary.

T05 should build report, feedback, PDF/export, and related read APIs on top of T03 order state and T04 entitlements. It should not replace T04 evidence or merge later frontend/visual/owner tasks unless its own task document explicitly allows it.
