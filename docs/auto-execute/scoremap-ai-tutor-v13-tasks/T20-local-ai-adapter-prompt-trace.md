# T20 local AI adapter, prompt registry, and trace log

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T20-local-ai-adapter-prompt-trace.md'
```

## Implementation scope

Implement the local-only model boundary used by all AI-shaped operations. The default adapter must be deterministic and must never call external model endpoints.

## Allowed files

- `server/src/ai/**`
- `server/src/services/**` only to route through the adapter
- `server/test/**`
- `shared/**` if a trace helper is shared
- `docs/auto-execute/results/T20.json`
- `docs/auto-execute/latest/T20-HANDOFF.md`

## Required behavior

- Prompt registry with ids `LLM-PREVIEW-01`, `LLM-BASIC-02`, `LLM-FULL-03`, `LLM-QUESTION-04`, `LLM-TUTOR-05`, `LLM-EXERCISE-06`, `LLM-CHECK-07`.
- Trace table/store rows for prompt id, model adapter, request summary, response summary, status, error code, latency/cost placeholders, and local-only marker.
- Failure simulation for timeout and provider failure.
- Secret-safe logging.

## Verification

Run `npm --prefix server test -- ai-adapter prompt-registry` plus the existing local-only guard if available.

## Forbidden actions

No OpenAI/DeepSeek/Tencent/other model network calls. No real keys. No production endpoint strings.

## Output

Write `docs/auto-execute/results/T20.json` and `docs/auto-execute/latest/T20-HANDOFF.md`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy its LLM/model-call and safety sections for the adapter layer.
- Prove every mandatory prompt id has deterministic local responses, trace records, timeout/failure simulation, and secret-safe payloads.
- Ensure no UI page or business service needs a direct model-provider call.
- Write `docs/auto-execute/results/T20.json` and `docs/auto-execute/latest/T20-HANDOFF.md`.

## No pure PASS conditions

T20 must not report pure PASS if any mandatory LLM id lacks registry entry or trace proof, if any default path calls a real model provider, if secret-bearing fields are logged, or if local-only guard evidence is missing.
