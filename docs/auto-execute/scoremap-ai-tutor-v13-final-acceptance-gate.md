# scoremap AI tutor v1.3 final acceptance gate

## Pure PASS requirements

T33 may report pure PASS only when all are true:

- `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md` exists and every acceptance category in it has a machine-readable verdict.
- T19-T32 have result JSON files and HANDOFF files from later execution.
- Requirement matrix rows V13-R01 through V13-R15 have evidence.
- Every PRD v1.3 P0/P0.5 item has requirement id, task id, verification command, evidence path, and final status.
- Functional proof exists for wrong-question cards, `让 AI 老师讲给孩子听`, fixed follow-up buttons, similar exercise generation, answer submission, feedback, interaction history, My reports recovery, quota display, and quota-exhausted copy.
- UI references `ai`, `_1`, `_2`, `_3`, and `_4` have reference, actual, diff, metrics, and summary artifacts.
- Every visible P0 page/control in old C01-C12 plus new v1.3 pages/states has exact click evidence.
- All large-model call sites are in the inventory and have local adapter traces.
- `diagnosis_questions`, `question_interactions`, quota fields, and trace records have DB readback proof.
- New APIs pass success, validation, auth, ownership, not-found, quota, timeout, and provider-failure branches.
- Local-only guard proves no real payment/cloud/model/online DB calls.
- Secret guard proves no provider keys, child data dumps, or production tokens leaked.
- Mojibake scan for v1.3 docs, UI copy, and evidence summaries is clean for replacement characters and common UTF-8/GBK corruption fragments.
- Report integrity passes and the final result can be resumed from `docs/auto-execute/latest/HANDOFF.md`.

## Fail-closed statuses

- Missing raster visual proof: `PASS_NEEDS_MANUAL_UI_REVIEW`.
- Missing implementation or broken requirement: `REPAIR_REQUIRED`.
- Host cannot run required miniapp/browser evidence: `BLOCKED_BY_ENVIRONMENT`.
- Local-only or secret guard failure: `HARD_FAIL`.
- Missing source mapping: `BLOCKED_BY_MISSING_SOURCE`.
- Missing acceptance-standard category verdict: `REPAIR_REQUIRED`.
- Any mojibake in user-visible v1.3 copy or acceptance docs: `REPAIR_REQUIRED`.
