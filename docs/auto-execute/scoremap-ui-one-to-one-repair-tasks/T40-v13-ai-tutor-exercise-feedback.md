# T40 v1.3 AI tutor exercise feedback

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T40-v13-ai-tutor-exercise-feedback.md'
```

## Goal

Rebuild `ai-tutor`, `ai-exercise`, and `ai-exercise-feedback` as v1.3 one-to-one WXML/WXSS code replicas.

## References

- AI tutor: `docs/UI/小程序/stitch_codex_ui_design_kit/ai/code.html`, `screen.png`
- Similar exercise: `docs/UI/小程序/stitch_codex_ui_design_kit/_4/code.html`, `screen.png`
- Exercise feedback: `docs/UI/小程序/stitch_codex_ui_design_kit/_2/code.html`, `screen.png`

## Allowed files

- `scoremap-miniapp/pages/ai-tutor/**`
- `scoremap-miniapp/pages/ai-exercise/**`
- `scoremap-miniapp/pages/ai-exercise-feedback/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**` only for existing tutor/exercise bindings
- `scoremap-miniapp/utils/ai-tutor-v13-design.js` only for local tokens/assets already used by these pages
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/evidence/ui-one-to-one/T40/**`
- `docs/auto-execute/results/T40.json`
- `docs/auto-execute/latest/T40-HANDOFF.md`

## Required behavior

- Preserve quota display and exhausted/provider-failure states.
- Preserve all fixed question actions.
- Preserve similar-exercise generation, answer selection, submit answer, feedback, retry, return report, and history routes.
- Do not call real model providers; use the existing local adapter/data contracts.

## Verification

```powershell
npm test -- ai-tutor-interaction ai-exercise-feedback
npm run e2e:owner -- v13-ai-tutor-exercise-feedback
npm run visual:scoremap -- v13-ai-tutor v13-similar-exercise v13-answer-feedback
git diff --check
```

## Done when

- The three pages are code replicas from the v1.3 references.
- Quota, fixed actions, similar exercise, answer submit, feedback, and history routes remain working.
- `docs/auto-execute/results/T40.json` and `docs/auto-execute/latest/T40-HANDOFF.md` are written.
