# T25 one-to-one full report v1.3 page

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T25-full-report-v13-ui.md'
```

## Implementation scope

Rebuild the complete report state against `_3/screen.png`, including report content rows, wrong-question cards, share/export/save behavior, and AI tutor entry navigation.

## Allowed files

- `scoremap-miniapp/pages/full-report/**`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**`
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/results/T25.json`
- `docs/auto-execute/latest/T25-HANDOFF.md`

## Acceptance criteria

- Page matches `_3` structure and Chinese copy.
- Wrong-question cards render at least two seeded questions.
- `让 AI 老师讲给孩子听` navigates to detail/tutor with question id.
- Share/export behavior is either implemented and tested or hidden; visible PDF/export buttons must work.

## Verification

Run `npm test -- full-report-ai-entry` and visual structural capture for `_3`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy functional, UI, click, and localization acceptance for the full-report v1.3 state.
- Prove wrong-question cards, `让 AI 老师讲给孩子听`, share/export/save behavior, and full-report data bindings.
- Produce evidence targets that T30 and T31 can use for visual and normal-person click proof.
- Write `docs/auto-execute/results/T25.json` and `docs/auto-execute/latest/T25-HANDOFF.md`.

## No pure PASS conditions

T25 must not report pure PASS if the `_3` layout is materially generic or mismatched, if wrong-question cards or AI tutor entry are missing, if visible PDF/export controls do not work or are not hidden, or if Chinese copy is corrupted.
