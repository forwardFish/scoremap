const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFeedbackPageState } = require('../feedback');
const { createOrdersPageState } = require('../orders');
const { createReportsPageState } = require('../reports');
const { createMyPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- my-reports-feedback';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
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
  assert.equal(state.profile.userId, 'local-user-scoremap-t06');
  assert.match(state.rightsCard.proTreatment, /no subscription/i);
  assert.ok(state.stats.find((item) => item.id === 'generated-reports').value >= 2);
  assert.ok(state.stats.find((item) => item.id === 'analyzing').value >= 2);
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
    requirementIds: ['REQ143-006', 'REQ143-007', 'REQ143-008'],
    ownerScenarioIds: ['O143-09', 'O143-10'],
    uiReferences: ['UI143-C11C12'],
    route: state.route,
    renderedState: state,
    pageJumpEvidence: jumps,
    summary,
    apiCalls: client.calls
  });
});

test('reports, order records, and purchase records load local my-reports API and resolve all recovery statuses', () => {
  const client = createMiniappApiClient();
  createMyPageState(client).loadSummary();
  const reportsPage = createReportsPageState(client);
  const loadReports = reportsPage.loadReports();
  const reportsState = reportsPage.getState();
  const ordersState = createOrdersPageState(client, { mode: 'orders' }).getState();
  const purchasesState = createOrdersPageState(client, { mode: 'purchases' }).getState();
  const snapshot = client.store.snapshot();

  const expectedRecoveries = {
    'order-t12-full': { route: '/pages/full-report/index', mode: 'savedFullReport' },
    'order-t29-basic-only': { route: '/pages/basic-result/index', mode: 'basicDecision' },
    'order-v143-preview': { route: '/pages/preview/index', mode: 'previewDecision' },
    'order-t12-analyzing': { route: '/pages/analysis/index', mode: 'analysisProgress' },
    'order-v143-uploaded': { route: '/pages/analysis/index', mode: 'analysisProgress' },
    'order-v143-need-material': { route: '/pages/student-info/index', mode: 'supplementMaterial' },
    'order-v143-failed': { route: '/pages/failure/index', mode: 'failureRecovery' },
    'order-v143-timeout': { route: '/pages/failure/index', mode: 'failureRecovery' }
  };
  const recoveryEvidence = Object.fromEntries(Object.entries(expectedRecoveries).map(([orderId, expected]) => {
    const card = reportsState.cards.find((item) => item.orderId === orderId);
    const jump = reportsPage.openReportCard(orderId);
    assert.ok(card, `missing report card ${orderId}`);
    assert.equal(card.recoveryRoute, expected.route);
    assert.equal(card.recoveryMode, expected.mode);
    assert.equal(jump.targetRoute, expected.route);
    return [orderId, { card, jump, expected }];
  }));

  assert.equal(loadReports.status, 'REPORTS_READY');
  assert.equal(reportsState.route, '/pages/reports/index');
  assert.ok(reportsState.cards.length >= 8);
  assert.ok(reportsState.filterTabs.find((tab) => tab.id === 'failed'));
  assert.ok(reportsState.cards.some((card) => card.paymentStatus === 'paid'));
  assert.ok(ordersState.records.length >= 8);
  assert.equal(purchasesState.records.length, 2);
  assert.equal(snapshot.payments.length, 3);

  writeEvidence('V143-15-c11-c12-all-status-recovery.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['REQ143-006', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-017'],
    ownerScenarioIds: ['O143-09'],
    uiReferences: ['UI143-C11C12'],
    apiEvidence: {
      myReports: client.calls.filter((call) => call.method === 'GET' && call.path === '/api/my/reports')
    },
    recoveryEvidence,
    dbReadback: {
      reports: snapshot.diagnosis_orders,
      payments: snapshot.payments,
      tasks: snapshot.ai_analysis_tasks
    },
    renderedStates: {
      reports: reportsState,
      orders: ordersState,
      purchases: purchasesState
    },
    limitation: 'Deterministic page-state and local fixture DB evidence only; real WeChat screenshot/pixel review is not claimed in V143-15.'
  });
});

test('feedback page posts local feedback, records DB readback, owner limitation, visual limitation, and local-only guard', () => {
  const client = createMiniappApiClient();
  createMyPageState(client).loadSummary();
  const feedbackPage = createFeedbackPageState(client, { orderId: 'order-t12-full' });
  const submit = feedbackPage.submitFeedback({
    feedbackId: 'feedback-t12-my',
    rating: 'very_helpful',
    tags: ['clear_decision', 'next_step_clear'],
    text: 'Local V143-15 feedback: next step is clear.'
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
    'scoremap-miniapp/services/api-client.js',
    'scoremap-miniapp/utils/navigation.js'
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
  assert.deepEqual(submit.dbReadback.tags, ['clear_decision', 'next_step_clear']);
  assert.deepEqual(forbiddenRemoteFindings, []);

  writeEvidence('my-reports-feedback-owner-local.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['REQ143-006', 'REQ143-007', 'REQ143-008'],
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      scenarios: ['O143-09', 'O143-10'],
      clickPath: [
        '/pages/my/index',
        'open-reports',
        '/pages/reports/index',
        'open-report-card',
        '/pages/full-report/index',
        '/pages/my/index',
        'open-feedback',
        '/pages/feedback/index',
        'submit-feedback'
      ],
      apiEvidence: 'docs/auto-execute/evidence/frontend-page/V143-15-c11-c12-all-status-recovery.json',
      dbEvidence: 'docs/auto-execute/evidence/frontend-page/V143-15-c11-c12-all-status-recovery.json',
      limitation: 'V143-15 records deterministic C11/C12 owner actions. Pixel-perfect WeChat screenshot comparison remains outside this task.'
    },
    feedbackEvidence: {
      route: state.route,
      submit,
      apiCall: client.calls.find((call) => call.method === 'POST' && call.path === '/api/feedbacks')
    },
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      references: [
        'docs/UI/*v1.4.3-C11-my-reports-merged*.png',
        'UI143-C11C12'
      ],
      expectedVisualCommand: 'npm run visual:scoremap -- my reports',
      limitation: 'V143-15 uses structural visual evidence only. Pixel-perfect screenshot capture remains assigned to visual/final gates.'
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
