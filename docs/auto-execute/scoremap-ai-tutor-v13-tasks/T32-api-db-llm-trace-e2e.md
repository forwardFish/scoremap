# T32 API, DB, and LLM trace E2E

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T32-api-db-llm-trace-e2e.md'
```

## Implementation scope

Extend API/DB E2E to prove the new AI tutor backend from route through DB readback and local model trace.

## Allowed files

- `tests/api/**`
- `server/test/**`
- `server/src/**` only for small fixes discovered by tests
- `docs/auto-execute/evidence/api-db/**`
- `docs/auto-execute/evidence/llm/**`
- `docs/auto-execute/results/T32.json`
- `docs/auto-execute/latest/T32-HANDOFF.md`

## Acceptance criteria

- Covers all routes in the API/DB contract matrix.
- Covers every LLM call id from `LLM-PREVIEW-01` through `LLM-CHECK-07`.
- Covers success, validation, auth, ownership, not found, quota exceeded, timeout, provider failure, and duplicate/idempotent branches where applicable.
- Writes a final trace manifest connecting API call -> DB mutation/readback -> LLM trace -> UI consumer.

## Verification

Run `npm run e2e:api-db -- ai-tutor-v13`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy API contract, data, LLM trace, safety, and exception acceptance end to end.
- Prove every new API branch listed in the contract matrix and every LLM id `LLM-PREVIEW-01` through `LLM-CHECK-07`.
- Write a trace manifest connecting API call -> DB mutation/readback -> LLM trace -> UI consumer.
- Write `docs/auto-execute/results/T32.json` and `docs/auto-execute/latest/T32-HANDOFF.md`.

## No pure PASS conditions

T32 must not report pure PASS if any route lacks success/error proof, if DB readback is missing, if any mandatory LLM id lacks trace, if local-only/secret constraints are violated, or if the trace manifest cannot connect backend evidence to UI consumers.
