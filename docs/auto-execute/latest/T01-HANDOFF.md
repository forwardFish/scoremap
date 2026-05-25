# T01 HANDOFF

## Status
PASS_WITH_LIMITATION for the T01 local runtime scaffold boundary.

T01 has a working local-only Node scaffold for shared contracts, a local API runtime, miniapp route metadata, local in-memory DB readback, and scaffold evidence. It does not implement T02+ durable adapters, product APIs, full feature pages, visual diff tooling, or owner E2E flows.

The literal PowerShell command `npm install; npm test; npm run build --if-present` is blocked on this host by the PowerShell execution policy for `npm.ps1` before project code runs. The equivalent Windows command form `npm.cmd install; npm.cmd test; npm.cmd run build --if-present` passed and executed the same package scripts.

## Completed
- Added root `package.json` with local `npm test` and `npm run build --if-present` commands.
- Added shared local-only guard, in-memory DB, and scaffold route/API contracts.
- Added `server/local-runtime.js` with:
  - `GET /api/scaffold/ping`
  - `POST /api/scaffold/db-readback`
- Added `server/.env.example` with `LOCAL_ONLY=true` and `SCOREMAP_ADAPTER_MODE=local-mock`.
- Added `scoremap-miniapp` scaffold files with launch route `/pages/scaffold/index`.
- Added tests that generate scaffold evidence under `docs/auto-execute/evidence/scaffold/`.
- Added build validation that scans scaffold files for forbidden remote call patterns.
- Added `docs/auto-execute/results/T01.json`.
- Added `docs/auto-execute/evidence/scaffold/test-command-summary.json` to record the blocked literal command and passing npm.cmd rerun.

## Validation
Required command attempted:

```powershell
npm install; npm test; npm run build --if-present
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked C:\Program Files\nodejs\npm.ps1 by execution policy before project code ran.
```

Equivalent command run:

```powershell
npm.cmd install; npm.cmd test; npm.cmd run build --if-present
```

Observed result:

```text
npm install: PASS, audited 1 package, 0 vulnerabilities
npm test: PASS, 11 passed, 0 failed
npm run build --if-present: PASS, T01 local runtime scaffold build PASS
```

Note: `npm test` also discovers T02 tests currently present in the workspace. T01 result/evidence remains limited to scaffold files.

## Failures And Repairs
- Environment failure: PowerShell blocked `npm.ps1`; no project code ran.
- Local repair/alternative: reran the same npm operations through `npm.cmd`, which passed.
- Prior repair retained: the npm test script uses `node --test --test-isolation=none ...` to avoid Node worker spawning issues in this environment while preserving the same assertions.

## Evidence Paths
- Command summary: `docs/auto-execute/evidence/scaffold/test-command-summary.json`
- Page jump/route scaffold: `docs/auto-execute/evidence/scaffold/page-route-scaffold.json`
- Interface call scaffold: `docs/auto-execute/evidence/scaffold/api-call-scaffold.json`
- Database mutation/readback scaffold: `docs/auto-execute/evidence/scaffold/db-readback-scaffold.json`
- Visual placeholder/comparison status: `docs/auto-execute/evidence/scaffold/visual-placeholder-status.json`
- Owner journey scaffold status: `docs/auto-execute/evidence/scaffold/owner-journey-scaffold.json`
- Build/runtime scaffold: `docs/auto-execute/evidence/scaffold/build-summary.json`
- Secret guard/local-only status: `docs/auto-execute/evidence/scaffold/local-only-secret-guard.json`
- Result JSON: `docs/auto-execute/results/T01.json`

## Next Task Permission
T01 permits the next lexical task, T02, to continue as a separate task boundary.

T02 should implement durable local DB, Tencent Cloud mock, and WeChat Pay mock adapters without replacing the T01 scaffold evidence or merging T03+ API work.
