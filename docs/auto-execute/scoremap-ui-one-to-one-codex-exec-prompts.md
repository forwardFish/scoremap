# Scoremap UI one-to-one repair Codex Exec 执行入口

Project root: `D:\lyh\agent\agent-frame\scoremap`
Task dir: `D:\lyh\agent\agent-frame\scoremap\docs\auto-execute\scoremap-ui-one-to-one-repair-tasks`
Execution mode: Run T34 through T43 sequentially. Each task must run in one fresh `codex exec` worker. Do not merge tasks.

One-sentence goal:
Repair Scoremap miniapp UI so all referenced screens are WXML/WXSS code replicas from docs/UI/小程序 code.html and screen.png, not screenshot-mounted pages or generic placeholder cards.

## Global rules

- Use the auto-execute skill.
- Read AGENTS.md first.
- Execute exactly one task document per worker.
- Do not start the next task from inside a worker.
- Stay inside the task allowed scope.
- Preserve route/API/click behavior.
- Do not use full-screen reference images as UI.
- Do not use remote CDN, remote fonts, remote images, production cloud, real payment, or secrets.
- If pixel-perfect diff evidence is unavailable, do not claim pure PASS.
- Every task must write `docs/auto-execute/results/<TASK-ID>.json`.
- Every task must write `docs/auto-execute/latest/<TASK-ID>-HANDOFF.md`.
- After writing result JSON and HANDOFF, exit the codex exec completely.

## Paste-ready queue

```powershell
Set-Location -LiteralPath 'D:\lyh\agent\agent-frame\scoremap'

codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T34-intake-reference-map.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T35-revert-generic-replica-shell.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T36-old-flow-home-analysis-failure.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T37-old-flow-preview-payment-result.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T38-old-flow-full-unlock-entry-my.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T39-v13-report-and-wrong-question.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T40-v13-ai-tutor-exercise-feedback.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T41-support-pages-reports-orders-feedback-scaffold.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T42-visual-click-regression-gate.md'
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T43-final-ui-one-to-one-gate.md'
```

## Unified worker prompt template

```text
Use the auto-execute skill.

Project root: D:\lyh\agent\agent-frame\scoremap

Execute only this task document:
<TASK_DOC_ABSOLUTE_PATH>

Treat this as one fresh task boundary for <TASK_ID>.

Before editing or testing, read:
- D:\lyh\agent\agent-frame\scoremap\AGENTS.md
- D:\lyh\agent\agent-frame\scoremap\docs\auto-execute\scoremap-ui-one-to-one-repair-master.md
- D:\lyh\agent\agent-frame\scoremap\docs\auto-execute\scoremap-ui-one-to-one-codex-exec-prompts.md
- D:\lyh\agent\agent-frame\scoremap\docs\auto-execute\ui-target.json
- D:\lyh\agent\agent-frame\scoremap\scoremap-miniapp\app.json
- D:\lyh\agent\agent-frame\scoremap\scoremap-miniapp\routes.js

Rules:
- Execute only <TASK_ID>; do not start the next task.
- Stay within the task allowed files.
- One-to-one means WXML/WXSS code implementation from docs/UI/小程序 code.html and screen.png, not mounting a screenshot.
- Preserve all existing navigation, API, DB, and owner-click behavior unless the task explicitly repairs a broken behavior.
- Do not use remote CDN, remote fonts, remote images, production services, real payment, or secrets.
- Do not claim PASS without evidence.
- If visual screenshot/diff evidence is unavailable, use PASS_NEEDS_MANUAL_UI_REVIEW or a stricter non-PASS status.
- At the end, write D:\lyh\agent\agent-frame\scoremap\docs\auto-execute\results\<TASK_ID>.json.
- At the end, write D:\lyh\agent\agent-frame\scoremap\docs\auto-execute\latest\<TASK_ID>-HANDOFF.md.
- Include changed files, commands run, evidence paths, blockers, and next-step notes in the HANDOFF.
- After writing result JSON and HANDOFF, exit this codex exec completely.
```

## Scheduler guard

Before launching task N+1, the scheduler must verify the previous task wrote both required files:

- `docs/auto-execute/results/<TASK-ID>.json`
- `docs/auto-execute/latest/<TASK-ID>-HANDOFF.md`

If a result status is `REPAIR_REQUIRED`, `BLOCKED_BY_ENVIRONMENT`, `BLOCKED_BY_MISSING_SOURCE`, `HARD_FAIL`, or `FAIL`, stop the queue unless the task document explicitly says the next task is allowed to consume that blocker.
