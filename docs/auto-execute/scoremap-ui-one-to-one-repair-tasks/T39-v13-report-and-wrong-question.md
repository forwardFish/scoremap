# T39 v1.3 report and wrong question

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T39-v13-report-and-wrong-question.md'
```

## Goal

Rebuild the v1.3 `full-report` state and `wrong-question` page as one-to-one code replicas while preserving the existing v1.3 interaction contracts.

## References

- Full report v1.3: `docs/UI/小程序/stitch_codex_ui_design_kit/_3/code.html`, `screen.png`
- Wrong question: `docs/UI/小程序/stitch_codex_ui_design_kit/_1/code.html`, `screen.png`

## Allowed files

- `scoremap-miniapp/pages/full-report/**`
- `scoremap-miniapp/pages/wrong-question/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**` only for existing question/report bindings
- `scoremap-miniapp/utils/ai-tutor-v13-design.js` only for local tokens/assets already used by these pages
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/evidence/ui-one-to-one/T39/**`
- `docs/auto-execute/results/T39.json`
- `docs/auto-execute/latest/T39-HANDOFF.md`

## Required behavior

- Preserve wrong-question cards and data-backed card navigation.
- Preserve AI tutor entry with order/question context.
- Preserve share, save, and export behavior if visible; hide any visible control that cannot work locally.
- Keep old full-report state from T38 distinguishable from v1.3 state.

## Verification

```powershell
npm test -- full-report-ai-entry wrong-question-detail full-report-pdf
npm run e2e:owner -- v13-report-wrong-question
npm run visual:scoremap -- v13-full-report v13-wrong-question-detail
git diff --check
```

## Done when

- v1.3 full-report and wrong-question are not generic shells.
- Wrong-question cards, AI tutor entry, share/save/export behavior, and data bindings are verified or honestly limited.
- `docs/auto-execute/results/T39.json` and `docs/auto-execute/latest/T39-HANDOFF.md` are written.
