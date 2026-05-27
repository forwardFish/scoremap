# T23 AI tutor API, quota, permissions, and failures

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T23-ai-tutor-api-quota-auth.md'
```

## Implementation scope

Implement the new tutor API routes, quota enforcement, permissions, model adapter calls, failure handling, and DB readbacks.

## Required routes

- `GET /api/diagnosis-orders/{orderId}/questions`
- `POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions`
- `POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer`
- `GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions`

## Allowed files

- `server/src/routes/**`
- `server/src/services/**`
- `server/src/ai/**`
- `server/test/**`
- `tests/api/**` if shared e2e helpers need route normalization
- `docs/auto-execute/results/T23.json`
- `docs/auto-execute/latest/T23-HANDOFF.md`

## Acceptance criteria

- Enforce owner access, full entitlement, report quota 10, per-question quota 3.
- Accept only fixed action types.
- Record success, quota exceeded, validation error, provider timeout, provider failure, and out-of-scope redirect.
- Similar exercise and exercise answer are stored and traceable.
- API response copy uses PRD Chinese copy where specified.

## Verification

Run `npm --prefix server test -- ai-tutor quota auth failures`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy API contract, quota, auth, data, exception, and LLM acceptance for tutor routes.
- Prove success, validation, unauthenticated, unauthorized/cross-owner, not found, unpaid, quota exhausted, timeout, provider failure, and repeated-submit behavior.
- Prove successful interactions increment report/question quota correctly and failed calls do not.
- Write `docs/auto-execute/results/T23.json` and `docs/auto-execute/latest/T23-HANDOFF.md`.

## No pure PASS conditions

T23 must not report pure PASS if any new route lacks a negative branch, if quota can be bypassed, if a failed call consumes successful quota, if DB readback is missing, or if model calls are not traceable through the local adapter.
