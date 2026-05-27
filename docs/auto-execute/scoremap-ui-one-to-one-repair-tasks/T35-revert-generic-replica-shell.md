# T35 revert generic replica shell

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ui-one-to-one-repair-tasks\T35-revert-generic-replica-shell.md'
```

## Goal

Remove the bad generic `derived-card` / `derived-action` / `referenceAsset` / `codeSurface` repair and restore page-specific WXML/WXSS structures that later tasks can turn into true one-to-one replicas.

## Allowed files

- `scoremap-miniapp/utils/replica-runtime.js`
- `scoremap-miniapp/pages/**/index.wxml`
- `scoremap-miniapp/pages/**/index.wxss`
- `scoremap-miniapp/pages/**/index.js` only where required to preserve existing bindings
- `scoremap-miniapp/miniapp-shell.test.js`
- `scoremap-miniapp/navigation-click-audit.test.js`
- `scoremap-miniapp/routes.js` only if needed to preserve existing route contract names
- `docs/auto-execute/results/T35.json`
- `docs/auto-execute/latest/T35-HANDOFF.md`

## Required work

- Remove generic page-level replica helpers that flatten unrelated screens into the same card/action shell.
- Keep reusable helpers only when they preserve page-specific markup and do not hide reference mismatch.
- Ensure every required page has explicit, inspectable WXML sections for its own screen target.
- Remove any full-screen reference image mounting introduced as a shortcut.
- Preserve all existing `bindtap`, route, API, tab, and owner-click behavior.

## Verification

```powershell
npm test -- miniapp-shell routes
rg -n "derived-card|derived-action|referenceAsset|codeSurface" scoremap-miniapp
git diff --check
```

If `git diff --check` fails because of unrelated pre-existing changes, record the exact paths and keep T35 status no stronger than `PASS_WITH_LIMITATION`.

## Done when

- No generic replica shell remains in the repaired UI path.
- Route and shell tests pass or limitations are recorded.
- `docs/auto-execute/results/T35.json` and `docs/auto-execute/latest/T35-HANDOFF.md` are written.
