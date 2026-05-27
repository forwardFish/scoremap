# T22 full-report wrong-question card generation

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T22-full-report-question-cards.md'
```

## Implementation scope

Extend full-report generation so it creates L2 report content plus wrong-question cards that the UI and tutor APIs can consume.

## Allowed files

- `server/src/services/reports-service.js`
- `server/src/routes/reports.js`
- `server/src/ai/**`
- `server/test/**`
- `scoremap-miniapp/pages/full-report-entry/**` only for fixture compatibility if necessary
- `docs/auto-execute/results/T22.json`
- `docs/auto-execute/latest/T22-HANDOFF.md`

## Acceptance criteria

- `POST /api/diagnosis-orders/{orderId}/generate-full` creates full report, at least two wrong-question cards, quota fields, and `LLM-FULL-03` plus `LLM-QUESTION-04` traces.
- `GET /api/diagnosis-orders/{orderId}/full-report` returns wrong-question card summaries and quota.
- Full entitlement required.
- Missing basic decision, missing full entitlement, provider failure, and no-question fallback are tested.

## Verification

Run `npm --prefix server test -- full-report wrong-questions`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy functional, data, and LLM acceptance for full-report question-card generation.
- Prove full report generation creates at least two wrong-question cards, quota fields, `LLM-FULL-03` trace, and `LLM-QUESTION-04` trace.
- Prove full entitlement is required and no-question/provider-failure branches are handled honestly.
- Write `docs/auto-execute/results/T22.json` and `docs/auto-execute/latest/T22-HANDOFF.md`.

## No pure PASS conditions

T22 must not report pure PASS if wrong-question cards are absent, if card data is not available to UI/API consumers, if LLM trace evidence is missing, or if unpaid/basic users can generate full report tutor data.
