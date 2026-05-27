# T27 one-to-one AI tutor interaction page or expanded area

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T27-ai-tutor-interaction-ui.md'
```

## Implementation scope

Implement the AI tutor interaction surface matching `ai/screen.png`.

## Allowed files

- `scoremap-miniapp/pages/ai-tutor/**` or equivalent embedded state
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/services/**`
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/results/T27.json`
- `docs/auto-execute/latest/T27-HANDOFF.md`

## Acceptance criteria

- Remaining count is visible.
- Five fixed buttons are clickable and mapped to API action types.
- Question accordion opens/closes.
- Interaction history entry opens the history/detail route or state.
- Quota exceeded and provider failure states are visible and tested.

## Verification

Run `npm test -- ai-tutor-interaction` and visual structural capture for `ai`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy functional, UI, click, LLM trace, quota, and exception acceptance for the tutor interaction surface.
- Prove five fixed buttons map to API action types, remaining count is visible, accordion/history work, and quota/provider failure states are visible.
- Prove the surface stays in current wrong-question context and does not become open-ended chat.
- Write `docs/auto-execute/results/T27.json` and `docs/auto-execute/latest/T27-HANDOFF.md`.

## No pure PASS conditions

T27 must not report pure PASS if any fixed button is missing or untraceable, if quota is hidden or wrong, if the UI allows open-ended unrelated chat, if provider/quota failure states are absent, or if `ai` visual evidence is missing.
