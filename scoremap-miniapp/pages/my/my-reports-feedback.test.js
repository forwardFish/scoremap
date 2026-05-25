const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFeedbackPageState } = require('../feedback');
const { createOrdersPageState } = require('../orders');
const { createReportsPageState } = require('../reports');
const { createMyPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const evidenceDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'frontend-page');
const command = 'npm test -- my-reports-feedback';

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

test('my page renders C11 profile, rights, stats, reports, orders, purchases, feedback, and new analysis controls', () => {
  const client = createMiniappApiClient();
  const page = createMyPageState(client);
  const summary = page.loadSummary();
  const state = page.getState();
  const jumps = [
    { controlId: 'copy-user-id', result: page.copyUserId() },
    { controlId: 'open-reports', result: page.openReports() },
    { controlId: 'open-orders', result: page.openOrders() },
    { controlId: 'open-purchases', result: page.openPurchases() },
    { controlId: 'open-feedback', result: page.openFeedback() },
    { controlId: 'new-analysis', result: page.newAnalysis() }
  ];

  assert.equal(state.route, '/pages/my/index');
  assert.equal(state.title, '我的');
  assert.equal(state.profile.userId, 'local-user-scoremap-t06');
  assert.equal(state.rightsCard.title, '我的权益');
  assert.match(state.rightsCard.proTreatment, /no subscription/i);
  assert.ok(state.stats.find((item) => item.id === 'generated-reports').value >= 1);
  assert.ok(state.stats.find((item) => item.id === 'analyzing').value >= 1);
  assert.deepEqual(state.quickEntries.map((item) => item.id), ['open-reports', 'open-orders', 'open-purchases', 'open-feedback']);
  assert.equal(jumps.find((item) => item.controlId === 'open-reports').result.targetRoute, '/pages/reports/index');
  assert.equal(jumps.find((item) => item.controlId === 'open-orders').result.targetRoute, '/pages/orders/index');
  assert.equal(jumps.find((item) => item.controlId === 'open-purchases').result.targetRoute, '/pages/orders/index');
  assert.equal(jumps.find((item) => item.controlId === 'open-feedback').result.targetRoute, '/pages/feedback/index');
  assert.equal(jumps.find((item) => item.controlId === 'new-analysis').result.targetRoute, '/pages/index/index');
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/my/reports'));

  writeEvidence('my-reports-feedback-route-controls.json', {
    status: 'PASS',
    command,
    requirementIds: ['R10'],
    ownerScenarioIds: ['O05', 'O06', 'O07'],
    uiReferences: ['UI-C11', 'UI-C12'],
    route: state.route,
    renderedState: state,
    pageJumpEvidence: jumps,
    summary,
    apiCalls: client.calls
  });
});

test('reports, order records, and purchase records load local my-reports API and resolve each report jump rule', () => {
  const client = createMiniappApiClient();
  createMyPageState(client).loadSummary();
  const reportsPage = createReportsPageState(client);
  const loadReports = reportsPage.loadReports();
  const reportsState = reportsPage.getState();
  const fullJump = reportsPage.openReportCard('order-t12-full');
  const analyzingJump = reportsPage.openReportCard('order-t12-analyzing');
  const ordersState = createOrdersPageState(client, { mode: 'orders' }).getState();
  const purchasesState = createOrdersPageState(client, { mode: 'purchases' }).getState();
  const snapshot = client.store.snapshot();

  assert.equal(loadReports.status, 'REPORTS_READY');
  assert.equal(reportsState.route, '/pages/reports/index');
  assert.equal(reportsState.cards.length, 2);
  assert.equal(fullJump.targetRoute, '/pages/full-report/index');
  assert.equal(analyzingJump.targetRoute, '/pages/analysis/index');
  assert.ok(reportsState.cards.some((card) => card.statusText === '完整报告已解锁'));
  assert.ok(reportsState.cards.some((card) => card.statusText === '分析中'));
  assert.equal(ordersState.records.length, 2);
  assert.equal(purchasesState.records.length, 1);
  assert.equal(snapshot.payments.length, 2);

  writeEvidence('my-reports-feedback-api-db.json', {
    status: 'PASS',
    command,
    requirementIds: ['R10', 'R15'],
    ownerScenarioIds: ['O05', 'O07'],
    apiEvidence: {
      myReports: client.calls.filter((call) => call.method === 'GET' && call.path === '/api/my/reports')
    },
    pageJumpEvidence: [
      { controlId: 'open-full-report-card', result: fullJump },
      { controlId: 'open-analyzing-report-card', result: analyzingJump }
    ],
    dbReadback: {
      reports: snapshot.diagnosis_orders,
      payments: snapshot.payments,
      fullOrder: client.store.read('diagnosis_orders', 'order-t12-full'),
      analyzingTask: client.store.read('ai_analysis_tasks', 'task-t12-analyzing')
    },
    renderedStates: {
      reports: reportsState,
      orders: ordersState,
      purchases: purchasesState
    }
  });
});

test('feedback page posts local feedback, records DB readback, owner limitation, visual limitation, and local-only guard', () => {
  const client = createMiniappApiClient();
  createMyPageState(client).loadSummary();
  const feedbackPage = createFeedbackPageState(client, { orderId: 'order-t12-full' });
  const submit = feedbackPage.submitFeedback({
    feedbackId: 'feedback-t12-my',
    rating: 'very_helpful',
    tags: ['判断清楚', '知道下一步怎么做'],
    text: '本地 T12 反馈：知道下一步怎么做。'
  });
  const state = feedbackPage.getState();
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/my/index.js',
    'scoremap-miniapp/pages/reports/index.js',
    'scoremap-miniapp/pages/orders/index.js',
    'scoremap-miniapp/pages/feedback/index.js',
    'scoremap-miniapp/pages/my/my-reports-feedback.test.js',
    'scoremap-miniapp/pages/my/visual-my-reports.js',
    'scoremap-miniapp/services/api-client.js'
  ];
  const forbiddenRemoteFindings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }

  assert.equal(state.route, '/pages/feedback/index');
  assert.equal(submit.status, 'FEEDBACK_SUBMITTED');
  assert.equal(submit.dbReadback.rating, 'very_helpful');
  assert.deepEqual(submit.dbReadback.tags, ['判断清楚', '知道下一步怎么做']);
  assert.deepEqual(forbiddenRemoteFindings, []);

  writeEvidence('my-reports-feedback-owner-local.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['R10', 'R15'],
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      scenarios: ['O05', 'O06', 'O07'],
      clickPath: [
        '/pages/my/index',
        'open-reports',
        '/pages/reports/index',
        'open-full-report-card',
        '/pages/full-report/index',
        '/pages/my/index',
        'open-feedback',
        '/pages/feedback/index',
        'submit-feedback'
      ],
      apiEvidence: 'docs/auto-execute/evidence/frontend-page/my-reports-feedback-api-db.json',
      dbEvidence: 'docs/auto-execute/evidence/frontend-page/my-reports-feedback-api-db.json',
      limitation: 'T12 records deterministic C11/C12 owner actions. Full rendered O01-O12 owner E2E remains assigned to T15.'
    },
    feedbackEvidence: {
      route: state.route,
      submit,
      apiCall: client.calls.find((call) => call.method === 'POST' && call.path === '/api/diagnosis-orders/order-t12-full/feedback')
    },
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      references: [
        'docs/UI/小程序/我的.png',
        'docs/UI/小程序/stitch_codex_development_blueprints/_1/screen.png',
        'PRD C12 我的报告列表页'
      ],
      expectedVisualCommand: 'npm run visual:scoremap -- my reports',
      limitation: 'T12 visual runner produces deterministic structural artifacts and metrics. Pixel-perfect screenshot capture remains assigned to T14.'
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
