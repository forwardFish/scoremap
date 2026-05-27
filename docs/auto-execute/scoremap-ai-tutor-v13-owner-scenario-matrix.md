# scoremap AI tutor v1.3 owner scenario matrix

| Scenario | Persona intent | Preconditions | Exact clicks | Expected API/DB/LLM evidence | Visual evidence | Status |
|---|---|---|---|---|---|---|
| V13-O14 | Parent opens complete report and finds wrong-question learning entry | full report generated, two questions, quota 10/10 | reports card -> full report -> wrong-question card -> `璁?AI 鑰佸笀璁茬粰瀛╁瓙鍚琡 | `GET full-report`, `GET questions`, question DB readback | `_3`, `_1` | PLANNED |
| V13-O15 | Student asks for step explanation | question detail open, quota available | AI CTA -> `鎴戜笉鎳傝繖涓€姝 | `POST interactions`, quota 10->9, `LLM-TUTOR-05` trace | `ai` | PLANNED |
| V13-O16 | Student asks why the method works | tutor open | `涓轰粈涔堣繖鏍风畻` | new interaction row, question quota increment | `ai` | PLANNED |
| V13-O17 | Student asks for another explanation | tutor open | `鎹竴绉嶆柟寮忚` | new interaction row, same question context | `ai` | PLANNED |
| V13-O18 | Student generates and answers a similar exercise | tutor open | `鍑轰竴閬撳悓绫婚` -> option choice -> submit | exercise row, answer row, `LLM-EXERCISE-06`, `LLM-CHECK-07` traces | `_4`, `_2` | PLANNED |
| V13-O19 | Student marks understood and returns to report | feedback open | `鎴戝凡缁忔噦浜哷 or return report -> full report | interaction summary row, route back | `ai`, `_3` | PLANNED |
| V13-O20 | Quota exhausted branch is visible and blocked | report quota used 10 or question quota used 3 | attempt any follow-up | API rejects with quota code, UI message shown, no extra success quota mutation | `ai` quota state | PLANNED |
| V13-O21 | Basic entitlement cannot formally use tutor | basic-only order | open basic result sample -> try formal tutor route | 403/entitlement error, no interaction row | locked/sample UI | PLANNED |
| V13-O22 | My reports resumes full report with remaining quota | saved full report with interactions | My -> 鎴戠殑鎶ュ憡 -> report card -> wrong question -> interaction history | `GET my/reports`, `GET interactions`, quota readback | reports/my plus `_1` | PLANNED |
| V13-O23 | Normal full-app sweep clicks every visible P0 control | seeded data across statuses | run all existing O01-O13 plus V13-O14-O22 and all route controls | complete click target inventory and no missing target route | all old + five new refs | PLANNED |
