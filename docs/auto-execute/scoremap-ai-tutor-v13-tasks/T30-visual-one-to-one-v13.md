# T30 visual one-to-one comparison for all v1.3 references

## Codex Exec

```powershell
codex exec --cd 'D:\lyh\agent\agent-frame\scoremap' --prompt-file 'docs\auto-execute\scoremap-ai-tutor-v13-tasks\T30-visual-one-to-one-v13.md'
```

## Implementation scope

Extend the visual harness so all five v1.3 references have reference/actual/diff/metrics/summary artifacts.

## Allowed files

- `tools/ui-visual/**`
- `scoremap-miniapp/pages/**/visual-*.js`
- `tests/**`
- `docs/auto-execute/evidence/visual-harness/ai-tutor-v13/**`
- `docs/auto-execute/results/T30.json`
- `docs/auto-execute/latest/T30-HANDOFF.md`

## Acceptance criteria

- References: `ai`, `_1`, `_2`, `_3`, `_4`.
- Each has target route/state, fixture, capture command, actual artifact, diff artifact, metrics JSON, and summary JSON.
- Material deviations are listed as repair items.
- Missing raster evidence cannot be upgraded to pure PASS.

## Verification

Run `npm run visual:scoremap -- ai-tutor-v13 all`.

## This task acceptance standard

- Load `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` and satisfy UI one-to-one acceptance for all five v1.3 references.
- Produce reference, actual, diff, metrics, and summary artifacts for `ai`, `_1`, `_2`, `_3`, and `_4`.
- List material deviations and route them to repair tasks instead of hiding them.
- Write `docs/auto-execute/results/T30.json` and `docs/auto-execute/latest/T30-HANDOFF.md`.

## No pure PASS conditions

T30 must not report pure PASS if any reference lacks actual/diff/metrics/summary, if only structural evidence exists for a pixel-sensitive claim, if material deviations lack repair routing, or if reference paths are missing.
