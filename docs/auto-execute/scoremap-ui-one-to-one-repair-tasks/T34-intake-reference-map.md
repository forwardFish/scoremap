# T34 intake reference map

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T34-intake-reference-map.md'
```

## Goal

Build the read-only inventory that proves what must be repaired before any product code changes. Map `app.json`, `routes.js`, `ui-target.json`, `docs/UI/小程序/**/code.html`, `screen.png`, named PNGs, and current WXML/WXSS status.

## Allowed files

- `docs/auto-execute/evidence/ui-one-to-one/T34/**`
- `docs/auto-execute/results/T34.json`
- `docs/auto-execute/latest/T34-HANDOFF.md`

No product code edits are allowed.

## Required inventory

- List all 15 required visual targets from `scoremap-ui-one-to-one-repair-master.md`.
- For each target, record route, route state, reference code HTML path, reference screenshot path, named PNG path if any, current WXML path, current WXSS path, current JS path, and current visual harness target if any.
- Explicitly mark `full-report` old state and `full-report` v1.3 state as separate targets on the same route.
- Identify pages that currently use generic fields such as `derived-card`, `derived-action`, `referenceAsset`, or `codeSurface`.
- Identify full-screen screenshot mounting, remote URLs, remote fonts, CDN links, and generic placeholder card surfaces.
- Record support pages `reports`, `orders`, `feedback`, and `scaffold` separately as non-pixel-reference support pages.

## Verification

Run read-only checks only:

```powershell
rg --files docs/UI/小程序
rg -n "derived-card|derived-action|referenceAsset|codeSurface|http://|https://|<image|background-image" scoremap-miniapp docs/auto-execute
```

## Done when

- `docs/auto-execute/results/T34.json` exists and includes status, target count, target map, risks, and next task notes.
- `docs/auto-execute/latest/T34-HANDOFF.md` exists and includes changed files, commands run, evidence paths, blockers, and next-step notes.
- No product code has changed.
- Status is honest: use `PASS` only for complete inventory; use `PASS_WITH_LIMITATION` or stricter if references are missing or ambiguous.
