# scoremap AI tutor v1.3 requirement traceability matrix

| Req id | PRD anchor | Requirement | Task(s) | Evidence target | Status |
|---|---|---|---|---|---|
| V13-R01 | 0.2, 6.2, C13 | Complete report exposes `璁?AI 鑰佸笀璁茬粰瀛╁瓙鍚琡 from wrong-question cards. | T22, T25, T26, T31 | `evidence/owner/O14-ai-tutor-entry.json`; visual `_3`, `_1` | PLANNED |
| V13-R02 | 5.5, 13.2 | Formal tutor use requires 9.9 full entitlement; basic/free users cannot formally ask. | T23, T31, T32 | API 403/entitlement evidence; locked UI evidence | PLANNED |
| V13-R03 | 5.5, C13 | Report max 10 interactions; each question max 3 interactions. | T21, T23, T32 | quota DB readback and quota-exceeded API transcript | PLANNED |
| V13-R04 | C13 | Fixed buttons only for first version; no open-ended chat surface. | T23, T27, T31 | click matrix and UI control map | PLANNED |
| V13-R05 | C13, 8.4, 20.5 | AI response stays around current wrong question and records summary. | T20, T23, T32 | LLM trace, prompt id, interaction row | PLANNED |
| V13-R06 | 6.2, 12.13 | Similar exercise can be generated and submitted for AI feedback. | T23, T28, T32 | exercise row, answer check row, visual `_4`, `_2` | PLANNED |
| V13-R07 | 12.11-12.14 | New APIs for question list, follow-up, exercise answer, and records. | T21, T23, T32 | API/DB matrix evidence | PLANNED |
| V13-R08 | 11.6-11.7 | Add `diagnosis_questions` and `question_interactions` storage. | T21, T22, T32 | DB readback evidence | PLANNED |
| V13-R09 | 7 C10 | Complete report looks formal and includes wrong-question cards. | T22, T25, T30 | visual `_3` actual/diff/metrics | PLANNED |
| V13-R10 | UI `_1` | Wrong-question detail page matches supplied reference. | T24, T26, T30 | visual `_1` actual/diff/metrics | PLANNED |
| V13-R11 | UI `ai` | AI tutor interaction page/expanded area matches supplied reference. | T24, T27, T30 | visual `ai` actual/diff/metrics | PLANNED |
| V13-R12 | UI `_4`, `_2` | Similar exercise and answer feedback pages match supplied references. | T24, T28, T30 | visual `_4`, `_2` actual/diff/metrics | PLANNED |
| V13-R13 | User instruction | Inventory all large-model call sites and make them testable. | T19, T20, T32, T33 | `evidence/llm-call-inventory.json` and trace E2E | PLANNED |
| V13-R14 | User instruction | Simulate a normal person clicking all pages. | T31, T33 | `evidence/owner/all-pages-ai-tutor-v13.json` | PLANNED |
| V13-R15 | 17.1-17.4 | Final acceptance covers function, business, technical, AI quality, and UI. | T33 | final gate result | PLANNED |
