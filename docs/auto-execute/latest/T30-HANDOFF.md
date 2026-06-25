# T30 Handoff

GeneratedAt: 2026-06-24T04:06:29.062Z
Status: PASS_NEEDS_MANUAL_UI_REVIEW

## Command

`npm run visual:scoremap -- ai-tutor-v13 all`

## Evidence

Root: `docs/auto-execute/evidence/visual-harness/ai-tutor-v13`

- ai: v13-ai-tutor -> PASS_NEEDS_MANUAL_UI_REVIEW; summary docs/auto-execute/evidence/visual-harness/ai-tutor-v13/ai-tutor/summary.json
- _1: v13-wrong-question-detail -> PASS_NEEDS_MANUAL_UI_REVIEW; summary docs/auto-execute/evidence/visual-harness/ai-tutor-v13/wrong-question-detail/summary.json
- _2: v13-answer-feedback -> PASS_NEEDS_MANUAL_UI_REVIEW; summary docs/auto-execute/evidence/visual-harness/ai-tutor-v13/answer-feedback/summary.json
- _3: v13-full-report -> PASS_NEEDS_MANUAL_UI_REVIEW; summary docs/auto-execute/evidence/visual-harness/ai-tutor-v13/full-report/summary.json
- _4: v13-similar-exercise -> PASS_NEEDS_MANUAL_UI_REVIEW; summary docs/auto-execute/evidence/visual-harness/ai-tutor-v13/similar-exercise/summary.json

## Material Deviations / Repair Routing

- ai/v13-ai-tutor: PASS_NEEDS_MANUAL_UI_REVIEW; Reference/actual/diff/metrics/summary exist, but this local harness uses deterministic structural SVG capture rather than live miniapp raster pixelmatch.; repair T30-manual-raster-review-or-pixel-capture-upgrade
- _1/v13-wrong-question-detail: PASS_NEEDS_MANUAL_UI_REVIEW; Reference/actual/diff/metrics/summary exist, but this local harness uses deterministic structural SVG capture rather than live miniapp raster pixelmatch.; repair T30-manual-raster-review-or-pixel-capture-upgrade
- _2/v13-answer-feedback: PASS_NEEDS_MANUAL_UI_REVIEW; Reference/actual/diff/metrics/summary exist, but this local harness uses deterministic structural SVG capture rather than live miniapp raster pixelmatch.; repair T30-manual-raster-review-or-pixel-capture-upgrade
- _3/v13-full-report: PASS_NEEDS_MANUAL_UI_REVIEW; Reference/actual/diff/metrics/summary exist, but this local harness uses deterministic structural SVG capture rather than live miniapp raster pixelmatch.; repair T30-manual-raster-review-or-pixel-capture-upgrade
- _4/v13-similar-exercise: PASS_NEEDS_MANUAL_UI_REVIEW; Reference/actual/diff/metrics/summary exist, but this local harness uses deterministic structural SVG capture rather than live miniapp raster pixelmatch.; repair T30-manual-raster-review-or-pixel-capture-upgrade

## Pure PASS

Not claimed. T30 produced complete local reference/actual/diff/metrics/summary evidence for the five v1.3 references, but no live miniapp raster pixelmatch is available in this harness.
