# T19 v1.3 source, UI, route, and LLM-call inventory

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T19-v13-inventory-llm-map.md'
```

## Implementation scope

Create a machine-readable inventory for PRD v1.3, the five Stitch UI references, current routes, current API/DB surfaces, and all large-model-shaped operations.

## Allowed files

- `docs/auto-execute/evidence/inventory/**`
- `docs/auto-execute/results/T19.json`
- `docs/auto-execute/latest/T19-HANDOFF.md`
- focused inventory helpers under `scripts/acceptance/**` only if needed

## Required inputs

- `docs/AI提分教练_PRD_MVP_v1.3_C端AI错题追问修订版.md`
- `docs/UI/小程序/stitch_codex_ui_design_kit/{ai,_1,_2,_3,_4}/`
- `scoremap-miniapp/app.json`
- `scoremap-miniapp/routes.js`
- `server/src/**`

## Acceptance criteria

- Produce `docs/auto-execute/evidence/inventory/v13-source-inventory.json`.
- Include exact five UI references, target page/state proposal, visible controls, and source dimensions if detectable.
- Include LLM call ids `LLM-PREVIEW-01` through `LLM-CHECK-07`.
- Include missing implementation gaps without claiming PASS.
- Run `npm test` and report-integrity check if available.

## Forbidden actions

Do not implement product code in this task. Do not remove old evidence. Do not mark product complete.

## Failure statuses

Use `BLOCKED_BY_MISSING_SOURCE` for missing PRD/UI files and `REPAIR_REQUIRED` for contradictory route/API facts.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and write an inventory that can support every acceptance category.
- Map every PRD v1.3 P0/P0.5 requirement to requirement id, planned task id, verification command, evidence target, and current status.
- Inventory all five UI references and all model-shaped calls `LLM-PREVIEW-01` through `LLM-CHECK-07`.
- Write `docs/auto-execute/results/T19.json` and `docs/auto-execute/latest/T19-HANDOFF.md`.

## No pure PASS conditions

T19 must not report pure PASS if any required source file is missing, if any P0/P0.5 requirement lacks a planned evidence target, if any UI reference is unmapped, if any LLM call id is missing, or if the inventory contains mojibake.
