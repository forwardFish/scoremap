# T28 one-to-one similar exercise and answer feedback

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T28-similar-exercise-feedback-ui.md'
```

## Implementation scope

Implement similar exercise and answer feedback states matching `_4/screen.png` and `_2/screen.png`.

## Allowed files

- `scoremap-miniapp/pages/ai-exercise/**`
- `scoremap-miniapp/pages/ai-exercise-feedback/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**`
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/results/T28.json`
- `docs/auto-execute/latest/T28-HANDOFF.md`

## Acceptance criteria

- Exercise page shows prompt, four options, submit, current wrong-question context, and bottom nav.
- Feedback page shows correct/incorrect result, explanation, retry/similar question, return report, and interaction history row.
- Answer submit calls API and records `LLM-CHECK-07` trace.

## Verification

Run `npm test -- ai-exercise-feedback` and visual structural captures for `_4` and `_2`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy functional, UI, API, DB, LLM trace, and exception acceptance for similar exercise and answer feedback.
- Prove exercise generation records `LLM-EXERCISE-06`, answer checking records `LLM-CHECK-07`, and answer/feedback data can be read back.
- Prove duplicate answer and answer-before-exercise branches are handled.
- Write `docs/auto-execute/results/T28.json` and `docs/auto-execute/latest/T28-HANDOFF.md`.

## No pure PASS conditions

T28 must not report pure PASS if `_4` or `_2` is not visually represented, if exercise options or submit cannot be clicked, if answer feedback lacks DB/LLM trace evidence, or if duplicate/missing-exercise edge cases are untested.
