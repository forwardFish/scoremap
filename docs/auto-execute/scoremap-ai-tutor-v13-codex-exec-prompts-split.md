# scoremap AI tutor v1.3 codex exec prompts split

## Queue rule

Run one fresh `codex exec` per task. Wait for the process to exit completely and verify that it wrote `docs/auto-execute/results/<TASK>.json` and `docs/auto-execute/latest/<TASK>-HANDOFF.md` before starting the next task.

## Paste-ready queue

```powershell
Set-Location -LiteralPath 'D:\lyh\agent\agent-frame\scoremap'

codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T19-v13-inventory-llm-map.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T20-local-ai-adapter-prompt-trace.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T21-question-interaction-db-schema.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T22-full-report-question-cards.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T23-ai-tutor-api-quota-auth.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T24-design-tokens-routes.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T25-full-report-v13-ui.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T26-wrong-question-detail-ui.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T27-ai-tutor-interaction-ui.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T28-similar-exercise-feedback-ui.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T29-my-reports-quota-history.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T30-visual-one-to-one-v13.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T31-normal-person-all-page-clicks.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T32-api-db-llm-trace-e2e.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T33-v13-final-acceptance-gate.md'
```

## Auto-execute instruction

The later `auto-execute` run must treat this file plus `scoremap-ai-tutor-v13-master-plan.md` as the queue source. It must also load `scoremap-ai-tutor-v13-acceptance-standard.md` before executing any T19-T33 task. It must not merge tasks into one long session.
