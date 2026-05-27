# T34 Handoff

Status: `PASS_WITH_LIMITATION`

## Changed Files

- `docs/auto-execute/evidence/ui-one-to-one/T34/read-only-checks.md`
- `docs/auto-execute/results/T34.json`
- `docs/auto-execute/latest/T34-HANDOFF.md`

No product code was edited by T34.

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

## Evidence Paths

- Result JSON: `docs/auto-execute/results/T34.json`
- Read-only check notes: `docs/auto-execute/evidence/ui-one-to-one/T34/read-only-checks.md`
- Valid reference root: `docs/UI/小程序`

## Findings

- All 15 required visual targets are mapped in `T34.json`.
- `full-report old` and `full-report v1.3` are separate targets on `/pages/full-report/index`.
- Support pages `reports`, `orders`, `feedback`, and `scaffold` are recorded separately as non-pixel-reference support pages.
- Generic shell usage remains in product code: `derived-card`, `derived-action`, `referenceAsset`, and `codeSurface`.
- No WXML screenshot-only `<image>` mounting was found by the requested scan, but reference asset metadata exists in the generic runtime.

## Blockers / Limitations

- The literal command `rg --files docs/UI/?????` fails on Windows with invalid path syntax; `rg --files docs/UI/小程序` succeeds and was used as the resolved reference root.
- `preview` and `basic-result` have named PNG references but no discovered exact `code.html` source.
- Existing worktree had many unrelated pre-existing product-code changes before T34 started.

## Next Step Notes

- T35 should remove the generic replica shell before per-screen repair.
- Later UI tasks must not collapse the two `full-report` states.
- T41 should treat support pages as code-rendered support surfaces, not pixel-reference parity screens.
