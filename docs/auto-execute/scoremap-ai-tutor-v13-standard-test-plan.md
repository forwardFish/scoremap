# scoremap AI tutor v1.3 standard test plan

| Test id | Surface | Command | Required proof | Status |
|---|---|---|---|---|
| V13-T19-A | Inventory | `npm test`; report-integrity | source inventory, route list, UI ref list, LLM call list | PLANNED |
| V13-STD-A | Acceptance standard | doc check plus mojibake scan | `scoremap-ai-tutor-v13-acceptance-standard.md` exists and T19-T33 reference it | PLANNED |
| V13-T20-A | AI adapter | `npm --prefix server test -- ai-adapter prompt-registry` | deterministic prompt/response/trace and local-only guard | PLANNED |
| V13-T21-A | DB schema | `npm --prefix server test -- question-interactions db-readback` | `diagnosis_questions`, `question_interactions`, trace rows | PLANNED |
| V13-T23-A | AI tutor API | `npm --prefix server test -- ai-tutor quota auth failures` | success and every negative branch | PLANNED |
| V13-T25-A | Full report UI | `npm test -- full-report-ai-entry` | wrong-question cards and tutor CTA | PLANNED |
| V13-T26-A | Question detail UI | `npm test -- wrong-question-detail` | `_1` controls, detail rows, CTA, history | PLANNED |
| V13-T27-A | Tutor UI | `npm test -- ai-tutor-interaction` | five fixed buttons, accordion, remaining quota, records | PLANNED |
| V13-T28-A | Exercise/feedback UI | `npm test -- ai-exercise-feedback` | exercise options, submit, feedback, return report | PLANNED |
| V13-T30-A | Visual comparison | `npm run visual:scoremap -- ai-tutor-v13 all` | reference/actual/diff/metrics/summary for all five refs | PLANNED |
| V13-T31-A | Normal-person click | `npm run e2e:owner -- ai-tutor-v13` | all pages/all controls route/API/DB/UI evidence | PLANNED |
| V13-T32-A | API/DB/LLM E2E | `npm run e2e:api-db -- ai-tutor-v13` | all new APIs, DB readbacks, LLM traces | PLANNED |
| V13-T33-A | Final gate | `powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-final-gate.ps1 -Scope ai-tutor-v13` | no missing evidence, no local-only leak, no secret leak | PLANNED |
