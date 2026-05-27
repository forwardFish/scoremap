# scoremap AI tutor v1.3 complete software acceptance standard

## Purpose

This document is the unified acceptance standard for T19-T33. It is stricter than a smoke test: the v1.3 increment is accepted only when requirement traceability, implementation behavior, UI reconstruction, API contracts, DB readbacks, LLM traces, user-click evidence, local-only safety, secret hygiene, report integrity, and the final gate are all proven by files under `docs/auto-execute/`.

## Requirement Traceability Acceptance

Every PRD v1.3 P0/P0.5 requirement must have:

- requirement id in `scoremap-ai-tutor-v13-requirement-traceability-matrix.md`;
- task id that implements or verifies it;
- test command or manual-review blocker;
- evidence path;
- final status.

T33 must fail closed when any requirement has no evidence.

## Functional Acceptance

The implementation must prove all of these behaviors:

- full report shows wrong-question cards;
- each eligible wrong-question card exposes `让 AI 老师讲给孩子听`;
- formal tutor use is available only after the 9.9 yuan full-report entitlement;
- fixed follow-up buttons are available and do not become open-ended chat;
- similar exercise generation, answer submission, answer feedback, and interaction summary work;
- interaction records can be reopened from the report/history flow;
- My reports can recover a finished report and show remaining tutor quota;
- report-level and question-level quota are visible and enforced;
- quota-exhausted copy is visible and blocks further successful interactions.

## UI One-To-One Acceptance

The five new references are mandatory visual targets:

- `docs/UI/小程序/stitch_codex_ui_design_kit/ai/screen.png`;
- `docs/UI/小程序/stitch_codex_ui_design_kit/_1/screen.png`;
- `docs/UI/小程序/stitch_codex_ui_design_kit/_2/screen.png`;
- `docs/UI/小程序/stitch_codex_ui_design_kit/_3/screen.png`;
- `docs/UI/小程序/stitch_codex_ui_design_kit/_4/screen.png`.

Each target must have reference, actual, diff, metrics, and summary artifacts. Missing raster/screenshot-grade proof must remain `PASS_NEEDS_MANUAL_UI_REVIEW` or `REPAIR_REQUIRED`; structural evidence alone cannot become pure PASS.

## Normal-Person Click Acceptance

The owner/student E2E must simulate a realistic human journey from home through upload, analysis, payment, full report, wrong-question detail, AI tutor, similar exercise, answer feedback, and My reports recovery.

Every visible P0 page, card, button, tab, back action, history row, retry action, locked state, and quota-exhausted state must have:

- click id;
- route transition or explicit no-navigation state;
- API call where applicable;
- DB readback where applicable;
- visible UI state;
- visual evidence path where applicable.

## API Contract Acceptance

Every new API must prove:

- method and path;
- request DTO and response DTO;
- success branch;
- validation error;
- unauthenticated error;
- unauthorized/cross-owner error;
- not-found error;
- unpaid entitlement error;
- quota-exceeded error;
- model timeout/provider failure where relevant;
- duplicate or repeated-submit behavior where relevant;
- frontend caller and DB side effect/readback.

## Data Acceptance

The local data layer must independently read back:

- `diagnosis_questions`;
- `question_interactions`;
- report quota fields;
- question quota fields;
- exercise/answer payloads;
- AI trace records.

Successful interactions must increment the correct quota. Failed provider calls, validation failures, entitlement failures, and quota-exceeded calls must not be counted as successful tutor usage.

## LLM/Model-Call Acceptance

All model-shaped operations must route through local mockable adapters. UI pages and business services must not call a model provider directly.

Mandatory call ids:

- `LLM-PREVIEW-01`;
- `LLM-BASIC-02`;
- `LLM-FULL-03`;
- `LLM-QUESTION-04`;
- `LLM-TUTOR-05`;
- `LLM-EXERCISE-06`;
- `LLM-CHECK-07`.

Each trace must include prompt id, input summary, output summary, trace id, status, failure code when applicable, adapter name, local-only marker, and secret-safe payloads.

## Safety And Localization Acceptance

Default execution must not use real payment, production cloud, online DB, or real model credentials. `run-local-only-guard.ps1` and `run-secret-guard.ps1` must pass.

Evidence and logs must not leak:

- provider keys;
- production URLs or merchant secrets;
- real child personal data;
- raw real model responses from outside the local mock boundary.

Chinese user-facing copy must not be mojibake. Any occurrence of replacement characters or common UTF-8/GBK corruption fragments in v1.3 docs, UI copy, or evidence summaries is a repair blocker.

## Exception And Boundary Acceptance

The test suite must cover:

- missing upload/material context;
- AI failure;
- AI timeout;
- wrong-question context missing;
- report quota exhausted;
- question quota exhausted;
- unpaid/basic user access;
- cross-user access;
- submitting an answer before an exercise exists;
- duplicate answer submission;
- visible PDF/export/share controls without working behavior.

## Non-Functional Acceptance

Tests must be repeatable locally. Evidence must not depend on random timing or nondeterministic model output. Mobile layout must show no obvious overlap, clipped button text, broken Chinese copy, or route dead ends.

Execution must be resumable from `docs/auto-execute/latest/HANDOFF.md` and task-level HANDOFF files.

## Evidence Integrity Acceptance

Every task T19-T33 must write:

- `docs/auto-execute/results/Txx.json`;
- `docs/auto-execute/latest/Txx-HANDOFF.md`.

T33 must read T19-T32 outputs and cannot rely on chat history, verbal claims, stale screenshots, or missing evidence.

## Final Gate Acceptance

Pure PASS is allowed only when all evidence exists for:

- requirement traceability;
- implemented functionality;
- UI one-to-one comparison;
- normal-person clicks;
- API contracts;
- DB readbacks;
- LLM traces;
- local-only guard;
- secret guard;
- report integrity;
- final gate result.

Otherwise the final status must be one of `REPAIR_REQUIRED`, `PASS_NEEDS_MANUAL_UI_REVIEW`, `BLOCKED_BY_ENVIRONMENT`, or `HARD_FAIL`, with exact blockers and next repair actions.
