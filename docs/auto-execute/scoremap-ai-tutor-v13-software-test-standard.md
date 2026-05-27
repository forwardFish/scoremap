# scoremap AI tutor v1.3 software test standard

This document is governed by `docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md`. If this file and the complete acceptance standard conflict, the complete acceptance standard wins.

## Required test layers

1. Unit tests for AI adapter, prompt registry, quota calculation, permissions, error mapping, and DB readbacks.
2. API tests for every new route with success, validation failure, unauthenticated, unauthorized, not found, quota exceeded, timeout, provider failure, duplicate/idempotent branch, and DB readback.
3. Miniapp page-state tests for every new page/control and every disabled/locked state.
4. Visual tests for all five new references: `ai`, `_1`, `_2`, `_3`, `_4`.
5. Owner click E2E that behaves like a normal parent/student and clicks all pages and all visible P0 controls.
6. API/DB/LLM trace E2E proving route -> API -> DB mutation/readback -> local model trace -> visible UI result.
7. Local-only, report-integrity, secret-guard, and final-gate checks.

## Visual proof standard

Every new reference needs:

- reference path;
- target route/state;
- viewport and source dimensions;
- token notes;
- actual capture;
- diff artifact;
- metrics JSON;
- summary JSON listing material deviations;
- repair task when the deviation is material.

If raster capture is not available, status must remain `PASS_NEEDS_MANUAL_UI_REVIEW` or `REPAIR_REQUIRED`; structural SVG alone is not pixel-perfect proof.

## Simulated normal-person click standard

The later owner E2E must click:

- existing C01-C12 pages from the previous pack;
- C10 complete report wrong-question cards;
- `让 AI 老师讲给孩子听`;
- AI tutor fixed buttons;
- accordion/detail/history controls;
- exercise option choices;
- submit answer;
- retry after tutor failure;
- exhausted quota state;
- report save/export/share controls if visible;
- My reports resume entry showing remaining tutor quota;
- all tabbar and back/home/reports navigation edges.

The evidence must list exact click ids, route transitions, API calls, DB readbacks, LLM trace ids, and visual artifacts.

## Final-gate behavior

Pure PASS is forbidden if any of these are missing:

- an implemented new route/state for a supplied reference;
- a click target for a visible P0 control;
- local adapter trace for an LLM-shaped operation;
- DB readback for wrong questions, interactions, exercises, quota, or feedback;
- visual evidence for any v1.3 P0 reference;
- local-only guard or secret guard.
