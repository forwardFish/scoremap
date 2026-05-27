# T43 final UI one-to-one gate

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T43-final-ui-one-to-one-gate.md'
```

## Goal

Read T34-T42 result JSON and HANDOFF files, run final gates, update the delivery report, and produce the honest final UI one-to-one verdict.

## Allowed files

- `docs/AUTO_EXECUTE_DELIVERY_REPORT.md`
- `docs/auto-execute/evidence/ui-one-to-one/T43/**`
- `docs/auto-execute/results/T43.json`
- `docs/auto-execute/latest/T43-HANDOFF.md`
- `docs/auto-execute/latest/HANDOFF.md`
- `docs/auto-execute/latest/verification-results.md`
- `docs/auto-execute/latest/blockers.md`
- `scripts/acceptance/run-final-gate.ps1` only for a narrowly scoped report-classification bug discovered by the final gate

Do not implement broad UI repair in T43. If the UI is not ready, report `REPAIR_REQUIRED` and point to the next repair target.

## Required reads

- `docs/auto-execute/results/T34.json` through `docs/auto-execute/results/T42.json`
- `docs/auto-execute/latest/T34-HANDOFF.md` through `docs/auto-execute/latest/T42-HANDOFF.md`
- `docs/auto-execute/scoremap-ui-one-to-one-repair-master.md`
- `docs/auto-execute/ui-target.json`
- `docs/auto-execute/visual-diff-report.json` if present
- `docs/auto-execute/evidence/visual-harness/summary.json` if present

## Final gates

```powershell
npm test
npm run e2e:owner
npm run visual:scoremap
npm run build
git diff --check
powershell -ExecutionPolicy Bypass -File .\scripts\acceptance\run-final-gate.ps1 -Scope ui-one-to-one
```

If `-Scope ui-one-to-one` is not supported, run the existing closest Scoremap scope and record the exact fallback command.

## Delivery report update

Update `docs/AUTO_EXECUTE_DELIVERY_REPORT.md` with:

- UI one-to-one task pack scope and T34-T43 status table.
- Required 15-screen evidence table.
- Support page status for reports/orders/feedback/scaffold without false pixel-reference claims.
- Commands run and evidence paths.
- Remaining blockers and manual-review limits.
- Final verdict.

## Honest verdict rules

- Pure `PASS` is allowed only if all required tasks passed and complete visual evidence, including pixel-diff-quality evidence, exists for all required screens.
- If all functional/click/build gates pass but pixel diff is unavailable, use `PASS_NEEDS_MANUAL_UI_REVIEW`.
- If any required screen is still generic, screenshot-mounted, missing route/click behavior, or missing reference mapping, use `REPAIR_REQUIRED`.
- If local environment prevents a required gate from running, use `BLOCKED_BY_ENVIRONMENT` or a stricter non-pass status.

## Done when

- Final report is updated honestly.
- `docs/auto-execute/results/T43.json` and `docs/auto-execute/latest/T43-HANDOFF.md` are written.
- The result JSON includes `finalVerdict`, `commandsRun`, `evidence`, `manualReviewRequired`, `blockers`, and `nextStep`.
