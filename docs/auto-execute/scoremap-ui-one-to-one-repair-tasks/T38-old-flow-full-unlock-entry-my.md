# T38 old flow full unlock entry my

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T38-old-flow-full-unlock-entry-my.md'
```

## Goal

Rebuild `full-unlock`, `full-report-entry`, and `my` as old-flow one-to-one code replicas.

## References

- Full unlock: `docs/UI/小程序/stitch_codex_development_blueprints/_4/code.html`, `screen.png`
- Full report entry: `docs/UI/小程序/stitch_codex_development_blueprints/_2/code.html`, `screen.png`, `docs/UI/小程序/完整提分报告.png`
- My: `docs/UI/小程序/stitch_codex_development_blueprints/_1/code.html`, `screen.png`, `docs/UI/小程序/我的.png`

## Allowed files

- `scoremap-miniapp/pages/full-unlock/**`
- `scoremap-miniapp/pages/full-report-entry/**`
- `scoremap-miniapp/pages/my/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**` only for preserving existing report/order/feedback bindings
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/evidence/ui-one-to-one/T38/**`
- `docs/auto-execute/results/T38.json`
- `docs/auto-execute/latest/T38-HANDOFF.md`

## Required behavior

- Full unlock keeps local/mock full payment and compliance copy.
- Full report entry keeps full report generation/view/save/home behavior.
- My keeps reports, orders, feedback, purchases, new analysis, and tab behavior.
- Do not break `reports`, `orders`, or `feedback` links; T41 will polish support pages.

## Verification

```powershell
npm test -- full-report-pdf my-reports-feedback basic-result-full-unlock
npm run e2e:owner -- old-flow-full-unlock-entry-my
npm run visual:scoremap -- full-unlock full-report-entry my
git diff --check
```

## Done when

- The three pages are reference-driven WXML/WXSS code pages.
- Full unlock, full report entry, support links, and tab behavior remain working.
- `docs/auto-execute/results/T38.json` and `docs/auto-execute/latest/T38-HANDOFF.md` are written.
