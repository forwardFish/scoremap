const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const {
  DEFAULT_FORBIDDEN_PATTERNS,
  assertLocalOnlyEnvironment,
  scanTextForForbiddenRemoteCalls
} = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const {
  BASIC_RESULT_ROUTE,
  FULL_REPORT_ROUTE,
  createBasicResultPageState
} = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- basic-result-full-unlock';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

test('C07 renders basic result, opens 9.9 half-screen payment modal, and supports cancel', () => {
  const client = createMiniappApiClient();
  const page = createBasicResultPageState(client, { orderId: 'order-v143-c07-basic' });

  const load = page.loadBasicDecision();
  const opened = page.showPaymentModal();
  const openedState = page.getState();
  const cancelled = page.cancelPayment();

  assert.equal(openedState.route, BASIC_RESULT_ROUTE);
  assert.equal(load.status, 'BASIC_READY');
  assert.equal(load.apiStatus, 200);
  assert.equal(opened.status, 'MODAL_OPEN');
  assert.equal(opened.modal.visible, true);
  assert.equal(opened.modal.priceText, '9.9元');
  assert.equal(opened.modal.benefits.length, 6);
  assert.match(openedState.hero.title, /初步分析已生成/);
  assert.equal(openedState.lockedReportCard.modules.length, 5);
  assert.match(openedState.upgradeCard.priceText, /9\.9/);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.targetRoute, BASIC_RESULT_ROUTE);

  writeEvidence('V143-12-c07-modal-open-cancel.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-008'],
    ownerScenarioIds: ['O143-03'],
    uiReferences: ['UI143-C07'],
    pageState: openedState,
    pageJumpEvidence: [
      { controlId: 'open-9-9-payment-modal', result: opened },
      { controlId: 'cancel-9-9-payment', result: cancelled }
    ],
    apiCalls: client.calls
  });
});

test('C07 full payment uses local mock, generates full report, and routes to C10', () => {
  const client = createMiniappApiClient();
  const page = createBasicResultPageState(client, { orderId: 'order-v143-c07-full' });

  page.loadBasicDecision();
  const opened = page.showPaymentModal();
  const paid = page.confirmFullPayment();
  const state = page.getState();
  const snapshot = client.store.snapshot();

  assert.equal(opened.modal.visible, true);
  assert.equal(paid.status, 'PAID');
  assert.equal(paid.targetRoute, FULL_REPORT_ROUTE);
  assert.equal(paid.accessLevel, 'full');
  assert.equal(paid.paymentReadback.adapter, 'local-wechat-pay-mock');
  assert.equal(paid.paymentReadback.callbackAdapter, 'local-wechat-pay-mock');
  assert.equal(paid.generateFullStatus, 200);
  assert.equal(paid.fullReportStatus, 200);
  assert.equal(state.paymentModal.visible, false);
  assert.equal(client.store.read('diagnosis_decisions', 'decision-order-v143-c07-full-full').level, 'full');
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/payments/create' && call.payloadSummary.paymentType === 'full'));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/payments/wechat/callback'));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/diagnosis-orders/order-v143-c07-full/generate-full'));
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-v143-c07-full/full-report'));

  writeEvidence('V143-12-c07-full-payment-c10-routing.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-006', 'API143-007', 'API143-008', 'API143-009', 'API143-010'],
    ownerScenarioIds: ['O143-03', 'O143-04'],
    uiReferences: ['UI143-C07'],
    pageJumpEvidence: [
      { controlId: 'open-9-9-payment-modal', result: opened },
      { controlId: 'confirm-full-payment', result: paid }
    ],
    apiEvidence: {
      basicDecision: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-v143-c07-full/basic-decision'),
      paymentCreate: client.calls.find((call) => call.path === '/api/payments/create' && call.payloadSummary.paymentType === 'full'),
      paymentCallback: client.calls.find((call) => call.path === '/api/payments/wechat/callback'),
      generateFull: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-v143-c07-full/generate-full'),
      fullReport: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-v143-c07-full/full-report')
    },
    dbReadback: {
      order: client.store.read('diagnosis_orders', 'order-v143-c07-full'),
      payment: paid.paymentReadback,
      fullDecision: client.store.read('diagnosis_decisions', 'decision-order-v143-c07-full-full'),
      allPayments: snapshot.payments,
      allTasks: snapshot.ai_analysis_tasks
    }
  });
});

test('C07 records login and failure recovery branches', () => {
  const client = createMiniappApiClient();
  const page = createBasicResultPageState(client, { orderId: 'order-v143-c07-recovery' });

  page.loadBasicDecision();
  const loginRequired = page.confirmFullPayment({ loggedIn: false });
  const paymentFailed = page.confirmFullPayment({ forcePaymentFailure: true });
  const retryPaid = page.confirmFullPayment();

  assert.equal(loginRequired.status, 'LOGIN_REQUIRED');
  assert.equal(loginRequired.targetRoute, '/pages/login/login');
  assert.equal(paymentFailed.status, 'PAYMENT_OR_GENERATION_FAILED');
  assert.equal(paymentFailed.retryAction, 'confirmFullPayment');
  assert.equal(paymentFailed.targetRoute, BASIC_RESULT_ROUTE);
  assert.equal(retryPaid.status, 'PAID');
  assert.equal(retryPaid.targetRoute, FULL_REPORT_ROUTE);

  writeEvidence('V143-12-c07-failure-recovery.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-006', 'API143-007', 'API143-009', 'API143-010'],
    ownerScenarioIds: ['O143-03', 'O143-04', 'O143-11', 'O143-12'],
    branches: {
      loginRequired,
      paymentFailed,
      retryPaid
    }
  });
});

test('C07 implementation stays local-only and records visual limitation', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/basic-result/index.js',
    'scoremap-miniapp/pages/basic-result/index.wxml',
    'scoremap-miniapp/pages/basic-result/index.wxss',
    'scoremap-miniapp/pages/basic-result/basic-result-full-unlock.test.js',
    'scoremap-miniapp/pages/basic-result/visual-basic-result-full-unlock.js',
    'scoremap-miniapp/services/api-client.js',
    'scoremap-miniapp/services/local-fixture-store.js'
  ];
  const forbiddenRemoteFindings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }

  assert.deepEqual(forbiddenRemoteFindings, []);
  writeEvidence('V143-12-c07-owner-local-visual-limits.json', {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008', 'REQ143-009'],
    ownerScenarioIds: ['O143-03', 'O143-04'],
    uiReferences: [
      'docs/UI/小程序/v1.4.3-C07-完整初判-9.9解锁.png',
      'docs/UI/小程序/v1.4.3-C07-确认9.9支付半屏弹窗.png'
    ],
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      expectedVisualCommand: 'npm run visual:scoremap -- basic-result full-unlock',
      limitation: 'Fresh C07 structural evidence can be generated locally; true WeChat runtime screenshot parity is not claimed in this child task.'
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
