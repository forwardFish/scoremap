# scoremap API and DB contract matrix

| Method | Path | Auth rule | Request DTO | Response DTO | Local DB mutation/readback | Frontend caller | Test/evidence |
|---|---|---|---|---|---|---|---|
| POST | /api/diagnosis-orders | anonymous allowed, binds local user | source, grade, subject, examType, materialType | orderId,status | users upsert; diagnosis_orders insert/readback | C01 upload | T03/T16 |
| POST | /api/diagnosis-orders/{orderId}/uploads | owner or anonymous order token | files[], authorizationAccepted | orderId,status,uploadedCount | upload_files insert; order status uploaded | C02 upload | T03/T16 |
| POST | /api/diagnosis-orders/{orderId}/start-preview-analysis | owner | none or retry flag | taskId,status | ai_analysis_tasks insert/update; preview decision mock | C03/C04 | T03/T16 |
| GET | /api/diagnosis-orders/{orderId}/analysis-progress | owner | path orderId | status,progress,currentStep,steps | ai_analysis_tasks readback | C03 | T03/T15 |
| GET | /api/diagnosis-orders/{orderId}/preview-decision | owner, preview_done | path orderId | status,accessLevel,decision | diagnosis_decisions.preview readback | C05 | T03/T16 |
| POST | /api/payments/create | owner | orderId,paymentType | paymentId,amount,paymentParams(mock) | payments pending insert | C06/C08 | T04/T16 |
| POST | /api/payments/wechat/callback | local mock signature only | paymentId,status,mockTransactionId | ok,status | payments paid/failed; order access_level/status | local payment mock | T04/T16 |
| GET | /api/diagnosis-orders/{orderId}/basic-decision | owner and access basic/full | path orderId | status,decision | diagnosis_decisions.basic readback | C07 | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/generate-full | owner and full_paid/full | path orderId | taskId,status | ai_analysis_tasks full; diagnosis_decisions.full | C08/C09 | T05/T16 |
| GET | /api/diagnosis-orders/{orderId}/full-report | owner and access full | path orderId | status,decision | diagnosis_decisions.full readback | C09/C10 | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/save-report | owner and access basic/full | path orderId | saved:true | diagnosis_orders saved flag/readback | C09/C10 | T05/T16 |
| GET | /api/my/reports | local user | query optional status | items[] | diagnosis_orders/payments join readback | C01/C11/C12 | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/feedback | owner and access basic/full | decisionLevel,rating,tags,text | feedbackId | feedbacks insert/readback | C11/C12/report | T05/T16 |
| POST | /api/diagnosis-orders/{orderId}/export-pdf | owner and access full | none | exportId,status | report_exports insert; local file URL | C10 | T05/T16 |
| GET | /api/report-exports/{exportId} | owner | path exportId | status,fileUrl | report_exports readback | C10 | T05/T16 |