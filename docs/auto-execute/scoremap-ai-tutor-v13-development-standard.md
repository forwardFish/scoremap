# scoremap AI tutor v1.3 development standard

## Scope rules

- Implement product code only in a later `auto-execute` run.
- Preserve local-only constraints. No real WeChat Pay, Tencent Cloud, online DB, remote storage, or production model endpoint may be called by default.
- If an actual model provider is later added, it must sit behind the same adapter contract, stay disabled in default tests, and never expose secrets in logs.

## Feature rules

- AI閿欓杩介棶 is an embedded complete-report capability, not a general chat product and not an independent open classroom.
- Formal tutor access requires full-report entitlement (`accessLevel=full`) and a generated wrong-question context.
- Fixed actions must include at least: `explain_step`, `why_this_method`, `alternative_explanation`, `generate_similar`, `mark_understood`.
- Per report quota: max 10 successful tutor interactions.
- Per question quota: max 3 successful tutor interactions.
- Each successful follow-up may create at most one similar exercise.
- Out-of-scope/free-form questions must be redirected to the current question context.
- Exceeding quota must show: `鏈鎶ュ憡鐨?AI 閿欓杩介棶娆℃暟宸茬敤瀹屻€備綘浠嶅彲浠ユ煡鐪嬪畬鏁存姤鍛婂拰 7 澶╁缓璁€俙

## Large-model call standards

Every LLM-shaped operation must be represented in `server/src/ai/` or an equivalent local adapter boundary:

| Call id | Trigger | Purpose | Default implementation | Required trace |
|---|---|---|---|---|
| LLM-PREVIEW-01 | start preview analysis | L0 initial preview | deterministic local mock | prompt id, order id, material summary, status, tokens/cost placeholder |
| LLM-BASIC-02 | get/generate basic decision | L1 full initial decision | deterministic local mock | prompt id, preview decision id, status |
| LLM-FULL-03 | generate full report | L2 complete report | deterministic local mock | prompt id, full task id, modules, status |
| LLM-QUESTION-04 | full report generation | extract wrong-question cards | deterministic local mock | prompt id, question ids, source decision id |
| LLM-TUTOR-05 | fixed follow-up action | explain current wrong question | deterministic local mock | prompt id, actionType, quota before/after, failure mode |
| LLM-EXERCISE-06 | generate similar exercise | create practice item | deterministic local mock | prompt id, interaction id, exercise id |
| LLM-CHECK-07 | submit exercise answer | judge answer and summary | deterministic local mock | prompt id, answer, correctness, summary |

No page or API may call a model provider directly. Tests must be able to assert the exact local adapter, prompt id, and trace row for each call.

## UI reconstruction rules

- Treat `screen.png` plus `code.html` in each reference folder as the visual source of truth.
- Extract shared tokens: canvas width, background, top bar height, spacing, type scale, colors, radii, shadows, icon rhythm, bottom nav, cards, and fixed CTA bars.
- Reuse existing miniapp patterns where they do not conflict with the reference; otherwise match the supplied reference.
- Do not create generic dashboards, placeholder cards, English-only copy, or marketing redesigns.
- External image URLs in `code.html` must be replaced by local deterministic assets or documented placeholders with the same composition.

## File boundaries

Allowed future implementation surfaces:

- `server/src/**`, `server/test/**`
- `shared/**`
- `scoremap-miniapp/app.json`, `scoremap-miniapp/routes.js`, `scoremap-miniapp/pages/**`, `scoremap-miniapp/services/**`, `scoremap-miniapp/utils/**`
- `tests/**`, `tools/ui-visual/**`, `scripts/acceptance/**`
- `docs/auto-execute/evidence/**`, `docs/auto-execute/results/**`, `docs/auto-execute/latest/**` during later execution only

Forbidden future implementation actions:

- deleting old acceptance tasks or evidence to hide failures;
- calling production model/payment/cloud endpoints;
- marking missing visual proof as pure PASS;
- exposing model prompts with secrets or child data beyond deterministic local fixtures.
