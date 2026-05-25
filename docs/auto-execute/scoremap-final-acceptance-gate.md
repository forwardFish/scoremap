# scoremap final acceptance gate

## Inputs
- docs/auto-execute/results/*.json
- docs/auto-execute/scoremap-requirement-traceability-matrix.md
- docs/auto-execute/scoremap-owner-scenario-matrix.md
- docs/auto-execute/evidence/visual/summary.json
- docs/auto-execute/evidence/owner/journey-summary.json
- docs/auto-execute/evidence/api-db/summary.json
- docs/auto-execute/evidence/safety/local-only.json
- docs/auto-execute/evidence/safety/secret-guard.json

## PASS algorithm
1. Every task T00-T18 result JSON exists and has status PASS.
2. Every P0/P1 requirement row has implementation and verification evidence.
3. Every UI reference has reference, actual, diff, metrics, and a reviewed threshold outcome.
4. Every owner scenario O01-O12 has click, route, API, DB, and visible UI proof.
5. API/DB evidence covers all routes in the API/DB contract matrix, including error cases.
6. Local-only guard proves no real Tencent Cloud, WeChat Pay, or online DB call.
7. Report integrity and secret guard pass.

## Non-pass statuses
- REPAIR_REQUIRED: product or evidence failure that can be fixed locally.
- PASS_WITH_LIMITATION: non-P0 evidence gap explicitly accepted, no false PASS.
- PASS_NEEDS_MANUAL_UI_REVIEW: screenshots exist but human visual review is still required.
- BLOCKED_BY_ENVIRONMENT: required local tool/runtime is unavailable.
- HARD_FAIL: safety breach, destructive action, real cloud/payment usage, or unrecoverable test failure.