# Verification Results

Latest task: T43 UI one-to-one final gate

Final verdict: **PASS_NEEDS_MANUAL_UI_REVIEW**

| Command | Status | Evidence |
| --- | --- | --- |
| `npm.cmd test` | PASS | `docs/auto-execute/evidence/ui-one-to-one/T43/npm-test-npmcmd.log` |
| `npm.cmd run e2e:owner` | PASS | `docs/auto-execute/evidence/ui-one-to-one/T43/e2e-owner.log` |
| `npm.cmd run visual:scoremap` | PASS_NEEDS_MANUAL_UI_REVIEW | `docs/auto-execute/evidence/ui-one-to-one/T43/visual-scoremap.log`, `docs/auto-execute/evidence/visual-harness/summary.json` |
| `npm.cmd run build` | PASS | `docs/auto-execute/evidence/ui-one-to-one/T43/build.log` |
| `git diff --check` | PASS | `docs/auto-execute/evidence/ui-one-to-one/T43/git-diff-check.log` |
| `powershell -ExecutionPolicy Bypass -File .\scripts\acceptance\run-final-gate.ps1 -Scope ui-one-to-one` | PASS_NEEDS_MANUAL_UI_REVIEW | `docs/auto-execute/evidence/ui-one-to-one/T43/final-gate-ui-one-to-one.log` |

The equivalent Windows-safe npm.cmd commands are the current gate evidence.
