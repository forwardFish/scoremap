# T36 old flow home analysis failure

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T36-old-flow-home-analysis-failure.md'
```

## Goal

Rebuild `home`, `analysis`, and `failure` as WXML/WXSS code replicas of the old-flow references.

## References

- Home: `docs/UI/小程序/stitch_codex_development_blueprints/ai_2/code.html`, `screen.png`, `docs/UI/小程序/首页.png`
- Analysis: `docs/UI/小程序/stitch_codex_development_blueprints/ai_1/code.html`, `screen.png`, `docs/UI/小程序/AI分析.png`
- Failure: `docs/UI/小程序/stitch_codex_development_blueprints/_3/code.html`, `screen.png`, `docs/UI/小程序/处理失败.png`

## Allowed files

- `scoremap-miniapp/pages/index/**`
- `scoremap-miniapp/pages/analysis/**`
- `scoremap-miniapp/pages/failure/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/utils/**` only for local page-specific visual helpers
- `scoremap-miniapp/services/**` only for preserving existing upload/progress bindings
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/evidence/ui-one-to-one/T36/**`
- `docs/auto-execute/results/T36.json`
- `docs/auto-execute/latest/T36-HANDOFF.md`

## Required behavior

- Keep upload / choose-file / create-order flow working.
- Keep analysis progress refresh and `later-view` navigation working.
- Keep failure retry, reupload, and back-home actions working.
- Do not use reference screenshots as full-screen UI.
- Do not introduce remote images, fonts, or CDN dependencies.

## Verification

```powershell
npm test -- home-upload analysis-failure
npm run e2e:owner -- old-flow-home-analysis-failure
npm run visual:scoremap -- home analysis failure
git diff --check
```

Record unavailable filtered command support honestly and run the closest broader command instead.

## Done when

- Home, analysis, and failure use page-specific code structures derived from the references.
- All relevant controls still click/navigate/call APIs as before.
- Visual evidence or manual-review limitation is recorded.
- `docs/auto-execute/results/T36.json` and `docs/auto-execute/latest/T36-HANDOFF.md` are written.
