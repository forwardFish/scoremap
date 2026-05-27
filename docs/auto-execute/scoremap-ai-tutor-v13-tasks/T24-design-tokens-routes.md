# T24 design tokens and route registration for five new pages/states

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T24-design-tokens-routes.md'
```

## Implementation scope

Extract and implement reusable v1.3 design tokens, local assets, route contracts, app.json page registrations, and page-state scaffolds for the five references.

## Allowed files

- `scoremap-miniapp/app.json`
- `scoremap-miniapp/routes.js`
- `scoremap-miniapp/pages/**`
- `scoremap-miniapp/utils/**`
- `scoremap-miniapp/services/**`
- `tests/**`
- `tools/ui-visual/**`
- `docs/auto-execute/results/T24.json`
- `docs/auto-execute/latest/T24-HANDOFF.md`

## Acceptance criteria

- Register target routes/states for full-report v1.3, wrong-question detail, AI tutor, similar exercise, and answer feedback.
- Route contracts list every visible control and target route/API.
- Shared tokens match reference colors, spacing, typography, cards, shadows, icons, and bottom nav.
- Local deterministic mascot/illustration strategy is documented.

## Verification

Run `npm test -- miniapp-shell routes ai-tutor`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy UI, click, localization, and route-contract acceptance for v1.3 foundations.
- Register all new routes/states needed by the five references and map every visible control to route/API/no-navigation behavior.
- Record shared design tokens and local deterministic asset strategy for later one-to-one comparison.
- Write `docs/auto-execute/results/T24.json` and `docs/auto-execute/latest/T24-HANDOFF.md`.

## No pure PASS conditions

T24 must not report pure PASS if any new reference lacks a route/state, if any visible P0 control lacks a target action, if copy contains mojibake, or if later visual/click tasks cannot consume the route contract.
