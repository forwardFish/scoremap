# scoremap software test standard

## Test process
| Step | Required output | Failure handling |
|---|---|---|
| Plan | test rows in scoremap-standard-test-plan.md | missing P0 row blocks PASS |
| Design | cases per requirement/page/API/entity/scenario | missing P0 case is REPAIR_REQUIRED |
| Environment | local start commands, fixtures, LOCAL_ONLY=true | unavailable tool is BLOCKED_BY_ENVIRONMENT |
| Execute | logs, screenshots, API transcripts, DB readbacks | missing evidence fails closed |
| Repair | defect note plus rerun | do not hide failures |
| Report | result JSON and HANDOFF | narrative alone is insufficient |
| Final gate | machine-readable verdict | pure PASS only with all P0 evidence |

## Local run standard
Future workers must define and prove local commands for backend, mini-program/front-end, local DB/mock storage, visual harness, API harness, owner E2E, report integrity, secret guard, and final gate. If a command is not yet available, the responsible task must implement it or report REPAIR_REQUIRED.

## Frontend page standard
Every P0 page must be opened or navigated to from a clean local run. Evidence must include:
- route and previous click path;
- rendered screenshot;
- list of clicked controls;
- expected route/modal/toast/state/API for each control;
- loading, empty, error, success, unauthorized, and persisted-data states where applicable.

## Visual one-to-one standard
Every UI PNG and Stitch screen.png must map to a local page screenshot. Future visual evidence must include reference, actual, diff, metrics JSON, viewport/miniprogram dimensions, allowed deviations, and verdict. Missing visual proof means PASS_NEEDS_MANUAL_UI_REVIEW or REPAIR_REQUIRED, never pure PASS.

## Backend/API standard
Every API in the matrix must test:
- success;
- request validation failure;
- auth/ownership failure;
- permission/entitlement failure where applicable;
- not found where applicable;
- duplicate/conflict where applicable;
- timeout or fallback behavior where applicable;
- local DB mutation and independent readback where applicable.

## Database standard
Every P0 business side effect must have mutation proof and independent readback proof. Export evidence must cover upload, payment, report, feedback, failure, and recovery data.

## Owner journey standard
The parent owner E2E must click every P0 page, tab, card, button, modal, form, and workflow action. Each step must record route, visible UI, API call, DB readback, screenshot/trace path, and pass/fail status.

## Local-only safety standard
Every verification run must prove:
- LOCAL_ONLY=true;
- payment adapter is mock;
- Tencent Cloud/storage/database adapter is local;
- no production domain or online DB URL was contacted;
- secret guard passed on env, source, logs, and evidence.

## Final PASS rule
Pure PASS is forbidden unless all P0 requirements, pages, APIs, DB side effects, visual references, local-only guards, and owner clicks have evidence. A backend-only green state, screenshots without DB proof, or manually asserted success is not PASS.