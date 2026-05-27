# Story Test Matrix

Generated: 05/25/2026 19:10:44

| Test point ID | Story ID | Type | Target | Expected | Evidence | Status |
|---|---|---|---|---|---|---|
| TP-STORY-REPORT-002-001 | STORY-REPORT-002 | api | POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-REPORT-002-002 | STORY-REPORT-002 | route | scoremap-miniapp/pages/wrong-question | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-REPORT-002-003 | STORY-REPORT-002 | functional | API rejects unentitled formal tutor access. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-002-004 | STORY-REPORT-002 | functional | Entitlement behavior is covered by negative branch evidence. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-002-005 | STORY-REPORT-002 | functional | Formal tutor use requires full-report entitlement; basic/free users cannot formally ask. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-002-006 | STORY-REPORT-002 | functional | UI shows the locked/basic state without starting formal interaction. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-003-001 | STORY-REPORT-003 | route | scoremap-miniapp/pages/ai-tutor | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-REPORT-003-002 | STORY-REPORT-003 | route | server/src/routes/question-interactions.js | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-REPORT-003-003 | STORY-REPORT-003 | route | server/src/services/question-interactions-service.js | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-REPORT-003-004 | STORY-REPORT-003 | functional | Each report allows at most 10 tutor interactions and each question allows at most 3 interactions. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-003-005 | STORY-REPORT-003 | functional | Question-level quota is enforced by API and persisted data. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-003-006 | STORY-REPORT-003 | functional | Quota-exceeded responses are covered by UI or API evidence. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-003-007 | STORY-REPORT-003 | functional | Report-level quota is enforced by API and persisted data. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-GENERAL-006-001 | STORY-GENERAL-006 | api | POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-GENERAL-006-002 | STORY-GENERAL-006 | route | scoremap-miniapp/pages/ai-exercise | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-GENERAL-006-003 | STORY-GENERAL-006 | route | scoremap-miniapp/pages/ai-exercise-feedback | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-GENERAL-006-004 | STORY-GENERAL-006 | functional | A similar exercise can be generated and submitted for AI feedback. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-GENERAL-006-005 | STORY-GENERAL-006 | functional | Feedback is returned and tied to the same question context. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-GENERAL-006-006 | STORY-GENERAL-006 | functional | Student can generate a similar exercise from the wrong-question context. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-GENERAL-006-007 | STORY-GENERAL-006 | functional | Student can submit an answer for that exercise. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-009-001 | STORY-REPORT-009 | route | scoremap-miniapp/pages/full-report | route is reachable and supports the story goal |  | PENDING |
| TP-STORY-REPORT-009-002 | STORY-REPORT-009 | functional | Full-report layout includes formal report structure. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-009-003 | STORY-REPORT-009 | visual | The complete report has a formal visual presentation and includes wrong-question cards. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-009-004 | STORY-REPORT-009 | visual | Visual harness evidence exists; raster pixel-perfect review remains manual. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
| TP-STORY-REPORT-009-005 | STORY-REPORT-009 | functional | Wrong-question cards are visible in the report. | acceptance criterion is proven by test/log/screenshot/API evidence |  | PENDING |
