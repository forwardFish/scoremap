# T21 wrong-question and interaction DB schema

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T21-question-interaction-db-schema.md'
```

## Implementation scope

Add local persistence for wrong-question cards, question interactions, exercises, answers, quota, and model traces.

## Allowed files

- `shared/in-memory-db.js`
- `server/src/db/**`
- `server/src/services/**`
- `server/test/**`
- `tests/api/**` only for readback coverage
- `docs/auto-execute/results/T21.json`
- `docs/auto-execute/latest/T21-HANDOFF.md`

## Required schema semantics

- `diagnosis_questions`: id, orderId, ownerId, index, title, originalQuestion, studentAnswer, correctAnswer, knowledgePoint, diagnosis, explanationSummary, masteryStatus, questionInteractionQuotaUsed.
- `question_interactions`: id, orderId, questionId, ownerId, actionType, promptId, traceId, response, exercise, submittedAnswer, correctness, summary, status, errorCode.
- `ai_model_traces` or equivalent.
- Order/report quota fields: total 10, used count, remaining count.

## Verification

Run `npm --prefix server test -- question-interactions db-readback` and add direct DB readback assertions.

## Forbidden actions

Do not use an online DB. Do not reset unrelated tables.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy its data acceptance section for local persistence.
- Prove independent readback for `diagnosis_questions`, `question_interactions`, quota fields, exercise/answer payloads, and AI trace records.
- Prove failed validation, entitlement, provider, and quota-exceeded branches do not count as successful tutor usage.
- Write `docs/auto-execute/results/T21.json` and `docs/auto-execute/latest/T21-HANDOFF.md`.

## No pure PASS conditions

T21 must not report pure PASS if any required table/store is missing, if quota fields cannot be read back independently, if failed interactions mutate success counters, or if any persistence evidence depends on an online DB.
