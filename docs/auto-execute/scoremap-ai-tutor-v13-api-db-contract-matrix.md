# scoremap AI tutor v1.3 API DB contract matrix

| Contract id | Method/path or DB table | Purpose | Auth/permission | Success side effect | Required negative tests | LLM trace | Status |
|---|---|---|---|---|---|---|---|
| V13-DB-Q | `diagnosis_questions` | Store wrong-question cards from full report | owner id tied to order | rows include question, answer, knowledge point, diagnosis, summary, question quota used | missing context, cross-owner access | `LLM-QUESTION-04` when extracted | PLANNED |
| V13-DB-I | `question_interactions` | Store tutor ask, exercise, answer, summary | owner id tied to order/question | rows include actionType, promptId, response, exercise, answer, status, errorCode | failed provider, quota exceeded, invalid action | `LLM-TUTOR-05`, `LLM-EXERCISE-06`, `LLM-CHECK-07` | PLANNED |
| V13-DB-T | `ai_model_traces` or equivalent | Audit every model-shaped call | local-only default | prompt id, request summary, response summary, model adapter, latency/cost placeholders | secret leakage, real endpoint call | all LLM ids | PLANNED |
| V13-API-01 | `GET /api/diagnosis-orders/{orderId}/questions` | List report wrong questions | `accessLevel=full`, owner only | no mutation; readback questions | unauthenticated, unauthorized, full report not generated, no questions | none | PLANNED |
| V13-API-02 | `POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions` | Fixed follow-up action | full entitlement, owner, quota available | increments quota, writes interaction, optional exercise | invalid action, quota exceeded, wrong owner, question not in order, timeout, provider failure | `LLM-TUTOR-05`; optional `LLM-EXERCISE-06` | PLANNED |
| V13-API-03 | `POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer` | Submit exercise answer | full entitlement, owner, interaction belongs to question | writes answer, correctness, feedback, summary | missing exercise, invalid option, duplicate answer, quota exhausted branch | `LLM-CHECK-07` | PLANNED |
| V13-API-04 | `GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions` | Read interaction history | full entitlement, owner | no mutation; ordered history | unauthenticated, unauthorized, question not found | none | PLANNED |
| V13-API-05 | existing `POST /api/diagnosis-orders/{orderId}/generate-full` | Generate full report plus wrong-question cards | full entitlement | full decision, task, questions, traces | full entitlement missing, provider failure, no basic decision | `LLM-FULL-03`, `LLM-QUESTION-04` | PLANNED |

## Data readback requirements

Every API success test must independently read the local DB/store and assert:

- owning user id;
- order id;
- question id;
- interaction id;
- quota before and after;
- prompt id and trace id where applicable;
- visible UI state can consume the same record.
