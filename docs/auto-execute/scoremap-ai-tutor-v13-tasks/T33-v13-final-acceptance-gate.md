# T33 v1.3 final acceptance gate

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T33-v13-final-acceptance-gate.md'
```

## Implementation scope

Run and, if necessary, repair the v1.3 final gate until the increment has an honest final verdict.

## Allowed files

- `scripts/acceptance/**`
- `docs/auto-execute/results/T33.json`
- `docs/auto-execute/latest/T33-HANDOFF.md`
- `docs/AUTO_EXECUTE_DELIVERY_REPORT.md`
- small code/test fixes only when required by final-gate failures

## Acceptance criteria

- T19-T32 result JSON and HANDOFF files exist and are internally consistent.
- `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` is loaded and every section receives an explicit verdict in the final result.
- `npm test`, `npm run e2e:owner -- ai-tutor-v13`, `npm run e2e:api-db -- ai-tutor-v13`, `npm run visual:scoremap -- ai-tutor-v13 all`, local-only guard, secret guard, report-integrity, and final gate all run.
- Final report states pure PASS only if every required evidence item exists for requirements, function, UI one-to-one comparison, normal-person clicks, API contracts, DB readbacks, LLM traces, local-only guard, secret guard, report integrity, and final gate.
- Otherwise report `PASS_NEEDS_MANUAL_UI_REVIEW`, `PASS_WITH_LIMITATION`, `REPAIR_REQUIRED`, `BLOCKED_BY_ENVIRONMENT`, or `HARD_FAIL` with exact blockers.
- Mojibake scan over v1.3 docs, UI copy, and evidence summaries is clean for replacement characters and common UTF-8/GBK corruption fragments.

## This task acceptance standard

- Write `docs/auto-execute/results/T33.json` with one verdict per category from `scoremap-ai-tutor-v13-acceptance-standard.md`.
- Write `docs/auto-execute/latest/T33-HANDOFF.md` with the final status, blockers, next repair action, and exact evidence paths.
- Read T19-T32 outputs rather than relying on chat history or assumed completion.
- Confirm T33 is the only authority for final v1.3 PASS.

## No pure PASS conditions

T33 must not report pure PASS if any category from `scoremap-ai-tutor-v13-acceptance-standard.md` is missing, if any T19-T32 result/HANDOFF is missing, if any UI target lacks accepted evidence, if any LLM call lacks trace proof, if any API/DB readback is absent, if local-only or secret guard fails, or if mojibake remains in user-visible v1.3 copy.

## Verification

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-final-gate.ps1 -Scope ai-tutor-v13
```
