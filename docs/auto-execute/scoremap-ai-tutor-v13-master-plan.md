# scoremap AI tutor v1.3 auto-execute master plan

## Increment goal

Implement PRD v1.3 C端 AI错题追问能力 on top of the existing local-only scoremap miniapp:

- full report must expose key wrong-question cards and the `让 AI 老师讲给孩子听` entry;
- student can use fixed follow-up buttons, generate one similar exercise, submit an answer, and view feedback/summary;
- each report has total follow-up quota and each question has per-question quota;
- all large-model call sites are inventoried, routed through a local mockable adapter, traced, and covered by tests;
- five new UI references are reproduced one-to-one;
- a normal human journey clicks every page and every visible P0 control.

## Existing baseline dependency

T00-T18 remain prerequisites. Before T19 starts, a later `auto-execute` worker must inspect:

- `docs/auto-execute/results/`
- `docs/auto-execute/latest/`
- `scripts/acceptance/check-report-integrity.ps1`
- `scoremap-miniapp/app.json`
- `scoremap-miniapp/routes.js`
- `tests/e2e/owner-click-flow.test.js`
- `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md`

If earlier task results are missing or contradictory, T19 must write a blocker rather than silently assuming product completion.

## Task table

| Task | Name | Surface | Required verification | Result JSON | Status |
|---|---|---|---|---|---|
| T19 | v1.3 source, UI, route, and LLM-call inventory | documentation+harness | `npm test`; report-integrity check | `docs/auto-execute/results/T19.json` | PLANNED |
| T20 | Local AI model adapter, prompt registry, and trace log | backend-foundation | `npm --prefix server test -- ai-adapter prompt-registry` | `docs/auto-execute/results/T20.json` | PLANNED |
| T21 | Wrong-question and interaction DB schema | backend-db | `npm --prefix server test -- question-interactions db-readback` | `docs/auto-execute/results/T21.json` | PLANNED |
| T22 | Full-report wrong-question card generation | backend-report | `npm --prefix server test -- full-report wrong-questions` | `docs/auto-execute/results/T22.json` | PLANNED |
| T23 | AI tutor API, quota, permissions, failures | backend-api-ai | `npm --prefix server test -- ai-tutor quota auth failures` | `docs/auto-execute/results/T23.json` | PLANNED |
| T24 | Design tokens and route registration for five new pages/states | frontend-foundation | `npm test -- miniapp-shell routes ai-tutor`; visual structural smoke | `docs/auto-execute/results/T24.json` | PLANNED |
| T25 | One-to-one full report v1.3 page | frontend-page | `npm test -- full-report-ai-entry`; visual target `_3` | `docs/auto-execute/results/T25.json` | PLANNED |
| T26 | One-to-one wrong-question detail page | frontend-page | `npm test -- wrong-question-detail`; visual target `_1` | `docs/auto-execute/results/T26.json` | PLANNED |
| T27 | One-to-one AI tutor interaction page/expanded area | frontend-page | `npm test -- ai-tutor-interaction`; visual target `ai` | `docs/auto-execute/results/T27.json` | PLANNED |
| T28 | One-to-one similar exercise and answer feedback | frontend-page | `npm test -- ai-exercise-feedback`; visual targets `_4` and `_2` | `docs/auto-execute/results/T28.json` | PLANNED |
| T29 | My reports recovery, quota display, interaction history | frontend-page | `npm test -- my-reports-ai-tutor`; visual/report-list smoke | `docs/auto-execute/results/T29.json` | PLANNED |
| T30 | Visual one-to-one comparison for all v1.3 refs | visual-harness | `npm run visual:scoremap -- ai-tutor-v13 all` | `docs/auto-execute/results/T30.json` | PLANNED |
| T31 | Normal-person all-page click E2E | e2e-owner | `npm run e2e:owner -- ai-tutor-v13`; all click evidence | `docs/auto-execute/results/T31.json` | PLANNED |
| T32 | API, DB, and LLM trace E2E | api-db-llm-e2e | `npm run e2e:api-db -- ai-tutor-v13`; LLM trace readback | `docs/auto-execute/results/T32.json` | PLANNED |
| T33 | v1.3 final acceptance gate | final-gate | `powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-final-gate.ps1 -Scope ai-tutor-v13` | `docs/auto-execute/results/T33.json` | PLANNED |

## Final stop condition

The increment is not complete until T33 proves:

- every new PRD v1.3 P0/P0.5 requirement has implementation evidence;
- every new UI reference has reference, actual, diff, metrics, and summary evidence or an honest non-PASS limitation;
- every large-model call site is routed through a local mockable adapter and has prompt, request, response, failure, timeout, and cost/trace metadata in local evidence;
- every new API has method/path/auth/validation/error/side-effect/DB-readback tests;
- a normal simulated user clicks all existing and new pages, cards, buttons, tabs, modals, exercise choices, retry paths, history links, save/export/share controls, and disabled/locked states.
- the final gate evaluates every section in `scoremap-ai-tutor-v13-acceptance-standard.md` and fails closed for any missing proof.
