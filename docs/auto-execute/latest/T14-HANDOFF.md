# T14 HANDOFF

## Status
PASS_NEEDS_MANUAL_UI_REVIEW for the visual one-to-one comparison harness.

Pure visual PASS is not claimed because the local task boundary has no PNG rasterizer or pixelmatch dependency. The harness produces deterministic local captures plus reference/actual/diff/metrics/summary artifacts and explicitly marks pixel-perfect review as manual.

## Completed
- Added `tools/ui-visual` as a local-only visual harness package.
- Routed root `npm run visual:scoremap -- all` through `tools/ui-visual/run-scoremap-visual.mjs`.
- Regenerated existing T07-T12 structural visual captures and aggregated them into T14 comparison evidence.
- Wrote per-screen evidence for 11 mapped UI screens under `docs/auto-execute/evidence/visual-harness/`.
- Wrote final visual summary mirror for later final gate use at `docs/auto-execute/evidence/visual/summary.json`.

## Validation
Required command attempted:

```powershell
npm --prefix tools/ui-visual test; npm run visual:scoremap -- all
```

Observed result:

```text
BLOCKED_BY_ENVIRONMENT: PowerShell blocked C:\Program Files\nodejs\npm.ps1 before project code ran.
```

Equivalent required command run:

```powershell
npm.cmd --prefix tools/ui-visual test; npm.cmd run visual:scoremap -- all
```

Observed result:

```text
tools/ui-visual test passed 1/1.
visual:scoremap generated 11 screen comparisons.
Final harness status: PASS_NEEDS_MANUAL_UI_REVIEW.
```

Additional safety scan:

```powershell
local-only forbidden endpoint and credential-marker scan (pattern redacted in report; see task evidence)
