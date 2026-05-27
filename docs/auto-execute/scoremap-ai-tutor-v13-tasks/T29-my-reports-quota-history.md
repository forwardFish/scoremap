# T29 My reports recovery, quota display, and interaction history

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T29-my-reports-quota-history.md'
```

## Implementation scope

Update My and reports-list flows so a user can revisit full reports, see AI tutor quota, and resume question interactions.

## Allowed files

- `scoremap-miniapp/pages/my/**`
- `scoremap-miniapp/pages/reports/**`
- `scoremap-miniapp/routes.js`
- `server/src/services/reports-service.js`
- `server/test/**`
- `tests/**`
- `docs/auto-execute/results/T29.json`
- `docs/auto-execute/latest/T29-HANDOFF.md`

## Acceptance criteria

- My reports list exposes full-report status and remaining tutor quota.
- Full report card resumes to complete report/wrong question based on status.
- Interaction history can be re-opened from report detail.
- Basic/free orders do not imply formal tutor entitlement.

## Verification

Run `npm test -- my-reports-ai-tutor`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy functional, click, data, and resumability acceptance for My reports recovery.
- Prove My/reports flows show full-report status, remaining tutor quota, saved/revisited reports, and interaction history entry points.
- Prove basic/free reports do not imply formal tutor entitlement.
- Write `docs/auto-execute/results/T29.json` and `docs/auto-execute/latest/T29-HANDOFF.md`.

## No pure PASS conditions

T29 must not report pure PASS if a user cannot resume a full report, if quota/history are absent or stale, if report status routes are wrong, or if unpaid reports expose formal tutor actions.
