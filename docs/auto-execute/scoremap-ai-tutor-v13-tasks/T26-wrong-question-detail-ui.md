# T26 one-to-one wrong-question detail page

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T26-wrong-question-detail-ui.md'
```

## Implementation scope

Implement the wrong-question detail surface matching `_1/screen.png`.

## Allowed files

- `scoremap-miniapp/pages/wrong-question/**` or equivalent embedded state
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**`
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/results/T26.json`
- `docs/auto-execute/latest/T26-HANDOFF.md`

## Acceptance criteria

- Shows original question, student answer, correct answer, knowledge point, diagnosis, explanation summary.
- Shows AI teacher CTA and interaction history row.
- Back, more, bottom nav, and return-report controls have deterministic actions.
- Locked/basic user state is tested.

## Verification

Run `npm test -- wrong-question-detail` and visual structural capture for `_1`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy UI, function, data-readback, and click acceptance for wrong-question detail.
- Prove original question, student answer, correct answer, knowledge point, diagnosis, explanation summary, AI teacher CTA, and history row are fixture/API backed.
- Prove locked/basic-user behavior is visible and cannot formally use tutor actions.
- Write `docs/auto-execute/results/T26.json` and `docs/auto-execute/latest/T26-HANDOFF.md`.

## No pure PASS conditions

T26 must not report pure PASS if `_1` is not reproduced closely, if detail fields are placeholders without data source/readback, if the AI CTA is absent or incorrectly enabled for unpaid users, or if history navigation is dead.
