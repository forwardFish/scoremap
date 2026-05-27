# T34 Read-only Checks

## Commands Run

- `git status --short`
- `rg --files`
- `Get-Content -Raw app.json`
- `Get-Content -Raw scoremap-miniapp\app.json`
- `Get-Content -Raw scoremap-miniapp\routes.js`
- `Get-Content -Raw docs\auto-execute\ui-target.json`
- `Get-Content -Raw tools\ui-visual\visual-harness.mjs`
- `rg --files docs/UI/小程序`
- `rg --files docs/UI/?????`
- `rg -n "derived-card|derived-action|referenceAsset|codeSurface|http://|https://|<image|background-image" scoremap-miniapp docs/auto-execute`
- `rg -n "derived-card|derived-action|referenceAsset|codeSurface" scoremap-miniapp docs/auto-execute`
- `rg -n "<image|background-image|http://|https://|@font-face|font-family|cdn" scoremap-miniapp docs/auto-execute`
- `rg -n "createReplicaPage|reference|cards|hotspots|codeSurface|referenceAsset" scoremap-miniapp\pages scoremap-miniapp\utils\replica-runtime.js`

## Evidence Summary

- Resolved reference root: `docs/UI/小程序`.
- Literal task glob `docs/UI/?????` failed in PowerShell/rg with `os error 123`; this is recorded as a limitation because `docs/UI/小程序` is the valid directory name present in this checkout.
- Generic shell fields are present in `scoremap-miniapp/utils/replica-runtime.js` and many page WXML/WXSS files.
- No product code was edited by T34.
- Existing worktree was already dirty before T34; T34 writes are limited to:
  - `docs/auto-execute/evidence/ui-one-to-one/T34/read-only-checks.md`
  - `docs/auto-execute/results/T34.json`
  - `docs/auto-execute/latest/T34-HANDOFF.md`

## Key Findings

- Old-flow `preview` and `basic-result` have named PNG references, but no discovered `docs/UI/小程序/**/code.html` source was mapped for those exact screens.
- `full-report` old state and `full-report` v1.3 state share `/pages/full-report/index` and must remain separate repair targets.
- `reports`, `orders`, `feedback`, and `scaffold` are support pages without independent pixel-reference PNGs.
