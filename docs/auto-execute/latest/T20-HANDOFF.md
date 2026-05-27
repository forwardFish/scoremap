# T20 Handoff

GeneratedAt: 2026-05-25T15:22:32+08:00
WorkerRound: 2
Status: PASS

## Completed

- Added `server/src/ai` local deterministic AI adapter, prompt registry, and in-memory trace store.
- Covered mandatory prompt ids `LLM-PREVIEW-01`, `LLM-BASIC-02`, `LLM-FULL-03`, `LLM-QUESTION-04`, `LLM-TUTOR-05`, `LLM-EXERCISE-06`, and `LLM-CHECK-07`.
- Routed existing preview/basic/full AI-shaped service generation through the adapter.
- Added timeout and provider-failure simulation with trace rows.
- Added secret-safe request/response summaries and local-only guard evidence.

## Verification

- `npm --prefix server test -- ai-adapter prompt-registry` -> PASS
- `npm --prefix server test -- adapters` -> PASS
- `npm --prefix server test` -> PASS

## Evidence

- `docs/auto-execute/evidence/api-db-llm/T20-prompt-registry.json`
- `docs/auto-execute/evidence/api-db-llm/T20-deterministic-traces.json`
- `docs/auto-execute/evidence/api-db-llm/T20-failure-simulation.json`
- `docs/auto-execute/evidence/api-db-llm/T20-service-routing.json`
- `docs/auto-execute/evidence/api-db-llm/T20-local-only-secret-guard.json`
- `docs/auto-execute/results/T20.json`

## Next Boundary

Stop after T20. The next unfinished TODO item is T21 and must be handled by a fresh worker.
