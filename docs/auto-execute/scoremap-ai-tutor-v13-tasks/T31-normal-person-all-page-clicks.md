# T31 normal-person all-page click E2E

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T31-normal-person-all-page-clicks.md'
```

## Implementation scope

Extend the owner click E2E so it simulates a normal parent/student clicking every existing and new page/control.

## Allowed files

- `tests/e2e/**`
- `scoremap-miniapp/navigation-click-audit.test.js`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/pages/**`
- `docs/auto-execute/evidence/owner/**`
- `docs/auto-execute/evidence/navigation/**`
- `docs/auto-execute/results/T31.json`
- `docs/auto-execute/latest/T31-HANDOFF.md`

## Acceptance criteria

- Preserve old O01-O13 coverage.
- Add V13-O14 through V13-O23 coverage.
- Click all P0 pages, cards, buttons, tabs, modals, accordions, exercise choices, submit controls, retry controls, history rows, locked states, and quota-exceeded state.
- Assert route target exists in `app.json`.
- Assert API calls, DB readbacks, LLM trace ids, and visual evidence paths.

## Verification

Run `npm run e2e:owner -- ai-tutor-v13` and the navigation click audit.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy normal-person click acceptance for old C01-C12 plus new v1.3 pages/states.
- Prove V13-O14 through V13-O23 and a full-app sweep with click id, route/API, DB readback, LLM trace id where applicable, visible UI state, and visual evidence path.
- Include locked, retry, history, quota-exhausted, answer feedback, and My reports recovery paths.
- Write `docs/auto-execute/results/T31.json` and `docs/auto-execute/latest/T31-HANDOFF.md`.

## No pure PASS conditions

T31 must not report pure PASS if any visible P0 control is unclicked or unmapped, if any route target is absent from app config, if API/DB/LLM evidence is missing for a click that requires it, or if locked/quota-exhausted states are skipped.
