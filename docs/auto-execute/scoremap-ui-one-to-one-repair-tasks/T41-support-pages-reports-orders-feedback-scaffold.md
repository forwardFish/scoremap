# T41 support pages reports orders feedback scaffold

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T41-support-pages-reports-orders-feedback-scaffold.md'
```

## Goal

Repair support pages `reports`, `orders`, `feedback`, and `scaffold` so they are normal code-rendered pages in the same visual language and keep route state working.

## Allowed files

- `scoremap-miniapp/pages/reports/**`
- `scoremap-miniapp/pages/orders/**`
- `scoremap-miniapp/pages/feedback/**`
- `scoremap-miniapp/pages/scaffold/**`
- `scoremap-miniapp/scaffold.test.js`
- `scoremap-miniapp/navigation-click-audit.test.js`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**` only for support-page existing bindings
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/evidence/ui-one-to-one/T41/**`
- `docs/auto-execute/results/T41.json`
- `docs/auto-execute/latest/T41-HANDOFF.md`

## Required behavior

- Do not claim these pages have standalone pixel references.
- Match the app's repaired visual language from T36-T40.
- Reports list must preserve status-based jump rules.
- Orders must preserve purchase/order history display.
- Feedback must preserve submit behavior.
- Scaffold must preserve route-contract visibility and not masquerade as a reference screen.

## Verification

```powershell
npm test -- scaffold my-reports-feedback navigation-click-audit
npm run e2e:owner -- support-pages
npm run visual:scoremap -- reports
git diff --check
```

## Done when

- Support pages are normal code pages, not generic placeholders or screenshot mounts.
- No false pixel-reference claim is made for support pages.
- `docs/auto-execute/results/T41.json` and `docs/auto-execute/latest/T41-HANDOFF.md` are written.
