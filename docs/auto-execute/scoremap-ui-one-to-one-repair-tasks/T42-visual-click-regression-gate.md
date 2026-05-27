# T42 visual click regression gate

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T42-visual-click-regression-gate.md'
```

## Goal

Run the UI one-to-one regression gate after T34-T41. Repair only task-caused UI/click regressions inside this task boundary.

## Allowed files

- `scoremap-miniapp/pages/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/utils/**`
- `scoremap-miniapp/services/**`
- `scoremap-miniapp/*.test.js`
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/evidence/ui-one-to-one/T42/**`
- `docs/auto-execute/results/T42.json`
- `docs/auto-execute/latest/T42-HANDOFF.md`

Do not reopen backend/LLM implementation tasks except for a minimal local fixture or test repair needed by UI/click evidence.

## Required checks

Static no-screenshot and no-remote checks:

```powershell
rg -n "http://|https://|cdn|font-face|background-image:\s*url|<image[^>]+src=.*docs/UI|screen.png|首页.png|分析报告.png|1元支付.png|完整提分报告.png|我的.png" scoremap-miniapp
rg -n "derived-card|derived-action|referenceAsset|codeSurface" scoremap-miniapp
```

Regression gates:

```powershell
npm test
npm run e2e:owner
npm run visual:scoremap
npm run build
git diff --check
```

## Done when

- Static checks show no screenshot-mounted pages, no remote dependencies, and no generic replica shell.
- Required gates have been run and recorded.
- Task-caused UI/click regressions are fixed or explicitly recorded as blockers.
- `docs/auto-execute/results/T42.json` and `docs/auto-execute/latest/T42-HANDOFF.md` are written.

## Honest status rule

If `npm run visual:scoremap` can only produce structural/manual-review evidence and no true pixel diff, T42 status must be no stronger than `PASS_NEEDS_MANUAL_UI_REVIEW`.
