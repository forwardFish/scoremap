# Story Map

Generated: 05/25/2026 19:10:43

| Story ID | Epic | Sprint | Priority | Actor | Goal | Source requirements | Surfaces | APIs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| STORY-REPORT-002 | EPIC-CORE | SPRINT-P0 | P0 | user | Formal tutor use requires full-report entitlement; basic/free users cannot formally ask. | V13-R02 | POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions, scoremap-miniapp/pages/wrong-question |  | PENDING |  |
| STORY-REPORT-003 | EPIC-CORE | SPRINT-P0 | P0 | user | Each report allows at most 10 tutor interactions and each question allows at most 3 interactions. | V13-R03 | scoremap-miniapp/pages/ai-tutor, server/src/routes/question-interactions.js, server/src/services/question-interactions-service.js |  | PENDING |  |
| STORY-GENERAL-006 | EPIC-CORE | SPRINT-P0 | P0 | user | A similar exercise can be generated and submitted for AI feedback. | V13-R06 | POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer, scoremap-miniapp/pages/ai-exercise, scoremap-miniapp/pages/ai-exercise-feedback |  | PENDING |  |
| STORY-REPORT-009 | EPIC-CORE | SPRINT-P0 | P0 | user | The complete report has a formal visual presentation and includes wrong-question cards. | V13-R09 | scoremap-miniapp/pages/full-report |  | PENDING |  |
