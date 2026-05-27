# T37 old flow preview payment result

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T37-old-flow-preview-payment-result.md'
```

## Goal

Rebuild `preview`, `basic-pay`, and `basic-result` as WXML/WXSS code replicas while preserving the 1 yuan unlock and report navigation flow.

## References

- Preview: `docs/UI/小程序/分析报告.png` plus mapped old-flow code reference.
- Basic pay: `docs/UI/小程序/stitch_codex_development_blueprints/1/code.html`, `screen.png`, `docs/UI/小程序/1元支付.png`
- Basic result: `docs/UI/小程序/完整初判结果*` related references and mapped code HTML.

## Allowed files

- `scoremap-miniapp/pages/preview/**`
- `scoremap-miniapp/pages/basic-pay/**`
- `scoremap-miniapp/pages/basic-result/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**` only for existing payment/report bindings
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/evidence/ui-one-to-one/T37/**`
- `docs/auto-execute/results/T37.json`
- `docs/auto-execute/latest/T37-HANDOFF.md`

## Required behavior

- Preview page keeps the visible 3-module preview, locked area, and 1 yuan CTA.
- Basic pay keeps local/mock payment only and routes to basic result.
- Basic result keeps basic decision content, full unlock CTA, and report navigation.
- Visible export/share/pay controls must either work locally with tests or be hidden.

## Verification

```powershell
npm test -- preview-basic-pay basic-result-full-unlock payment-api
npm run e2e:owner -- old-flow-preview-payment-result
npm run visual:scoremap -- preview basic-pay basic-result
git diff --check
```

## Done when

- The three pages are page-specific code replicas, not generic cards.
- 1 yuan payment, basic result unlock, and report navigation still work.
- `docs/auto-execute/results/T37.json` and `docs/auto-execute/latest/T37-HANDOFF.md` are written.
