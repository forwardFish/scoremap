# scoremap AI tutor v1.3 delivery standard index

## Scope

This incremental pack covers the five newly supplied mini-program UI references under `docs/UI/小程序/stitch_codex_ui_design_kit` and the PRD source `docs/AI提分教练_PRD_MVP_v1.3_C端AI错题追问修订版.md`.

It extends the existing scoremap T00-T18 pack. It does not replace earlier upload, payment, report, local-only, visual, owner-click, API/DB, or final-gate requirements. Future `auto-execute` work must continue from the existing repo state and implement this v1.3 increment as T19-T33.

## Source of truth order

1. Direct user instruction: implement the新增功能, UI one-to-one reproduction, simulate a normal person clicking all pages, and inventory all large-model call sites.
2. PRD v1.3: `docs/AI提分教练_PRD_MVP_v1.3_C端AI错题追问修订版.md`.
3. UI references: `docs/UI/小程序/stitch_codex_ui_design_kit/{ai,_1,_2,_3,_4}/screen.png` and matching `code.html`.
4. Existing code and acceptance surfaces: `scoremap-miniapp`, `server`, `shared`, `tests`, `tools`, and old `docs/auto-execute/scoremap-*`.
5. Local AGENTS.md and local-only safety rules.

## Document map

| Document | Purpose |
|---|---|
| `scoremap-ai-tutor-v13-master-plan.md` | T19-T33 implementation order and final stop condition. |
| `scoremap-ai-tutor-v13-acceptance-standard.md` | Complete software acceptance standard for requirement, function, UI, click, API, DB, LLM, safety, evidence, and final-gate proof. |
| `scoremap-ai-tutor-v13-development-standard.md` | Coding, UI, API, local AI adapter, prompt, data, and evidence rules. |
| `scoremap-ai-tutor-v13-software-test-standard.md` | Required tests for UI, clicks, API/DB, LLM trace, local-only, and final acceptance. |
| `scoremap-ai-tutor-v13-requirement-traceability-matrix.md` | PRD v1.3 requirements mapped to tasks and evidence. |
| `scoremap-ai-tutor-v13-ui-reference-map.md` | One-to-one visual targets for the five new UI references. |
| `scoremap-ai-tutor-v13-api-db-contract-matrix.md` | API, DB, auth, quota, side effect, readback, and LLM-call contract. |
| `scoremap-ai-tutor-v13-standard-test-plan.md` | Test rows for every planned acceptance surface. |
| `scoremap-ai-tutor-v13-owner-scenario-matrix.md` | Normal parent/student click flows, including every new page/control. |
| `scoremap-ai-tutor-v13-codex-exec-prompts-split.md` | One fresh `codex exec` prompt per task. |
| `scoremap-ai-tutor-v13-final-acceptance-gate.md` | Pure PASS gate definition for the v1.3 increment. |
| `scoremap-ai-tutor-v13-task-pack-quality-audit.md` | Generation-time audit of this pack. |
| `scoremap-ai-tutor-v13-tasks/` | Execution-ready task documents T19-T33. |

## Execution model

Each task document is one fresh `codex exec` boundary. A later runner must let the previous process exit completely and write its result JSON plus HANDOFF before starting the next task.

The generated task pack is documentation-only. It creates no implementation code, screenshots, result JSON, HANDOFF, API transcript, DB readback, or PASS evidence.
