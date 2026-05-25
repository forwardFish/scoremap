# scoremap standard test plan

## Local data policy
Use only local fixtures under server/fixtures, scoremap-miniapp/fixtures, and docs/auto-execute/evidence. Tests must set LOCAL_ONLY=true. Production-like Tencent Cloud, WeChat Pay, and online DB calls are forbidden.

## Test layers
- Backend unit/integration: adapters, services, routes, payment idempotency, permissions, state machine.
- Frontend static/page tests: each P0 page renders, controls have deterministic actions, route table matches PRD.
- Contract tests: request/response DTOs and error cases from the API/DB matrix.
- Full local flow smoke: upload -> preview -> 1 yuan -> basic -> 9.9 yuan -> full report -> save -> my reports -> feedback.
- Visual one-to-one comparison: UI PNG/Stitch screen versus local captures, with metrics JSON and diff PNG.
- Owner journey tests: every P0 click records visible UI, route, API call, DB readback, screenshot/trace.
- Safety tests: no production endpoint, no real payment, no real Tencent Cloud, no secrets in logs.
- Final gate: read task JSON files, fail closed on missing evidence.

## False PASS prohibitions
Do not mark PASS from narrative alone. Do not mark PASS if visual evidence is missing. Do not mark PASS if API passed but DB readback is missing. Do not mark PASS if backend is green but pages were not run. Do not mark PASS if payment/cloud mocks are not proven local-only.