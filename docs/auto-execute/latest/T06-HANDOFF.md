# T06 HANDOFF

## Status
PASS_WITH_LIMITATION for the T06 miniapp shell, navigation, route guard, local API client, and fixture contract boundary.

Pure PASS is not claimed because T06 does not own rendered page screenshots, visual diffs, pixel metrics, or the full O01-O12 owner click journey. The exact required PowerShell `npm` command is blocked by host execution policy, and the `npm.cmd test -- miniapp-shell` root runner still executes older server suites with non-T06 failures.

## Completed
- Added the miniapp shell route registry for C01-C12 and bottom tab metadata.
- Updated `app.json` with the shell pages and Home/My tab bar while preserving the T01 scaffold page.
- Added a local-only miniapp API client backed by an in-memory fixture store.
- Added route guard logic that maps order state/access level to the expected shell pages.
- Added minimal page-state modules for all shell routes.
- Added `miniapp-shell.test.js` to emit page jump, API call, DB readback, route guard, visual limitation, owner limitation, and local-only evidence.

## Validation
Required command attempted:

```powershell
npm test -- miniapp-shell
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked C:\Program Files\nodejs\npm.ps1 before project code ran.
```

Equivalent required command run:

```powershell
npm.cmd test -- miniapp-shell
```

Observed result:

```text
T06 miniapp-shell tests passed. The root script also ran older server tests and failed outside T06 in T04/T05 with intermittent 500 responses.
```

Focused T06 command run:

```powershell
node --test --test-isolation=none scoremap-miniapp\miniapp-shell.test.js
```

Observed result:

```text
4 tests passed, 0 failed
```

Additional checks:

```powershell
npm.cmd run lint --if-present
npm.cmd run build
```

Observed result:

```text
lint --if-present exited 0; build exited 0.
```

## Evidence Paths
- Page jump, route table, tab bar, and clickable control assertions: `docs/auto-execute/evidence/frontend-shell/page-route-shell.json`
- Local API calls and DB mutation/readback: `docs/auto-execute/evidence/frontend-shell/api-contract-shell.json`
- Route guard state-to-page assertions: `docs/auto-execute/evidence/frontend-shell/route-guard-shell.json`
- Visual limitation, owner limitation, local-only guard, and forbidden remote scan: `docs/auto-execute/evidence/frontend-shell/owner-visual-local-shell.json`
- Result JSON: `docs/auto-execute/results/T06.json`

## Failures And Repairs
- Fixed one T06 export issue in `routes.js` where `TAB_BAR` was not exported for `createMiniappShell`.
- No task-caused failure remains in the focused T06 test.
- Existing root-runner limitation remains: `npm.cmd test -- miniapp-shell` executes all root test globs and can fail in non-T06 server tests.

## Local-Only Safety
- Tests assert `LOCAL_ONLY=true` and `SCOREMAP_ADAPTER_MODE=local-mock`.
- Miniapp API behavior is handled by the local fixture adapter only.
- Payment evidence uses the `local-wechat-pay-mock` label and local fixture records only.
- Export evidence uses a `local-report-export://` URL only.
- Forbidden remote scan found no Tencent Cloud, WeChat Pay, online DB, production domain, or secret usage in T06 files/evidence.

## Next Task Permission
T06 permits the next lexical task, T07, to continue as a separate task boundary.

T07 should build the actual C01/C02 home/upload UI on top of this shell. It should not rewrite T06 evidence, and it should produce rendered page screenshots and visual evidence for its own page scope.
