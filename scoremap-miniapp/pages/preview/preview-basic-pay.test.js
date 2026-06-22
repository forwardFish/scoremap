const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createPreviewPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- preview-basic-pay';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

test('V143-11 C05 renders three preview modules, locked area, login gate, and 1 yuan half-screen modal', () => {
  const client = createMiniappApiClient();
  const page = createPreviewPageState(client, { orderId: 'order-v143-c05-preview' });
  const load = page.loadPreview();
  const stateBeforePay = page.getState();
  const modal = page.openPaymentModal();
  const stateWithModal = page.getState();
  const loginGate = createPreviewPageState(client, { orderId: 'order-v143-c05-login', loggedIn: false }).openPaymentModal();
  const later = page.backToReports();

  assert.equal(stateBeforePay.route, '/pages/preview/index');
  assert.equal(load.apiId, 'API143-005');
  assert.equal(load.visibleModuleCount, 3);
  assert.equal(stateBeforePay.visibleModules.length, 3);
  assert.equal(stateBeforePay.lockedArea.visible, true);
  assert.ok(stateBeforePay.lockedArea.modules.length >= 3);
  assert.equal(stateBeforePay.paymentModal.visible, false);
  assert.equal(modal.status, 'MODAL_OPEN');
  assert.equal(modal.modal.type, 'half-screen');
  assert.equal(stateWithModal.paymentModal.visible, true);
  assert.equal(stateWithModal.paymentModal.price.amountYuan, 1);
  assert.equal(stateWithModal.paymentModal.price.text, '1.00 元');
  assert.equal(stateWithModal.paymentModal.title, '解锁完整初判');
  assert.equal(stateWithModal.paymentModal.ctaText, '立即支付 1 元');
  assert.doesNotMatch(stateWithModal.paymentModal.ctaText, /完整报告/);
  assert.equal(loginGate.status, 'LOGIN_REQUIRED');
  assert.equal(loginGate.targetRoute, '/pages/login/login');
  assert.equal(later.targetRoute, '/pages/reports/index');

  writeEvidence('V143-11-c05-route-login-modal.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-005', 'API143-006', 'API143-007', 'API143-008'],
    ownerScenarioIds: ['O143-02', 'O143-11'],
    uiReferences: ['UI143-C05'],
    route: stateBeforePay.route,
    renderedStateBeforePay: stateBeforePay,
    renderedStateWithModal: stateWithModal,
    pageJumpEvidence: [
      { controlId: 'unlock-basic', result: modal },
      { controlId: 'login-gate', result: loginGate },
      { controlId: 'back-to-reports', result: later }
    ],
    apiCalls: client.calls
  });
});

test('V143-11 C05 confirms local 1 yuan payment, unlocks basic entitlement, and navigates to C07', () => {
  const client = createMiniappApiClient();
  const page = createPreviewPageState(client, { orderId: 'order-v143-c05-pay' });
  page.loadPreview();
  page.openPaymentModal();
  const paid = page.confirmBasicPayment();
  const stateAfterPay = page.getState();
  const snapshot = client.store.snapshot();

  assert.equal(paid.status, 'PAID');
  assert.equal(paid.targetRoute, '/pages/basic-result/index');
  assert.equal(paid.accessLevel, 'basic');
  assert.equal(stateAfterPay.paymentModal.visible, false);
  assert.equal(paid.paymentReadback.adapter, 'local-wechat-pay-mock');
  assert.equal(paid.paymentReadback.callbackAdapter, 'local-wechat-pay-mock');
  assert.equal(client.store.read('diagnosis_orders', 'order-v143-c05-pay').accessLevel, 'basic');
  assert.equal(client.store.read('diagnosis_decisions', 'decision-order-v143-c05-pay-basic').level, 'basic');
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/payments/create'));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/payments/wechat/callback'));
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-v143-c05-pay/basic-decision'));

  writeEvidence('V143-11-c05-payment-entitlement-c07.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-006', 'API143-007', 'API143-008'],
    ownerScenarioIds: ['O143-02'],
    uiReferences: ['UI143-C05', 'UI143-C07'],
    paymentFlow: paid,
    c07Navigation: { targetRoute: paid.targetRoute, query: paid.query },
    apiEvidence: {
      paymentCreate: client.calls.find((call) => call.path === '/api/payments/create'),
      paymentCallback: client.calls.find((call) => call.path === '/api/payments/wechat/callback'),
      basicDecision: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-v143-c05-pay/basic-decision')
    },
    dbReadback: {
      order: client.store.read('diagnosis_orders', 'order-v143-c05-pay'),
      previewDecision: client.store.read('diagnosis_decisions', 'decision-order-v143-c05-pay-preview'),
      payment: paid.paymentReadback,
      basicDecision: client.store.read('diagnosis_decisions', 'decision-order-v143-c05-pay-basic'),
      allPayments: snapshot.payments
    }
  });
});

test('V143-11 C05 blocks unpaid, logged-out, and failed local payment branches from C07', () => {
  const client = createMiniappApiClient();
  const unpaidPage = createPreviewPageState(client, { orderId: 'order-v143-c05-unpaid' });
  unpaidPage.loadPreview();
  const unpaidDecision = client.request('GET', '/api/diagnosis-orders/order-v143-c05-unpaid/basic-decision', {
    source: 'v143-c05-unpaid-direct-basic-read'
  });
  const loggedOutClient = createMiniappApiClient();
  const loggedOutPage = createPreviewPageState(loggedOutClient, {
    orderId: 'order-v143-c05-logged-out',
    loggedIn: false
  });
  const loggedOutOpen = loggedOutPage.openPaymentModal();
  const loggedOutConfirm = loggedOutPage.confirmBasicPayment();
  const failedPage = createPreviewPageState(client, {
    orderId: 'order-v143-c05-failed',
    mockPaymentStatus: 'failed'
  });
  failedPage.loadPreview();
  failedPage.openPaymentModal();
  const failedPayment = failedPage.confirmBasicPayment();
  const failedDecision = client.request('GET', '/api/diagnosis-orders/order-v143-c05-failed/basic-decision', {
    source: 'v143-c05-failed-direct-basic-read'
  });

  assert.equal(unpaidDecision.status, 403);
  assert.equal(unpaidDecision.body.code, 'BASIC_PAYMENT_REQUIRED');
  assert.equal(loggedOutOpen.status, 'LOGIN_REQUIRED');
  assert.equal(loggedOutConfirm.status, 'LOGIN_REQUIRED');
  assert.equal(loggedOutClient.store.list('payments').length, 0);
  assert.equal(failedPayment.status, 'PAYMENT_FAILED');
  assert.equal(failedPayment.targetRoute, '/pages/preview/index');
  assert.equal(failedPayment.accessLevel, 'preview');
  assert.equal(failedDecision.status, 403);
  assert.equal(client.store.read('diagnosis_orders', 'order-v143-c05-failed').accessLevel, 'preview');

  writeEvidence('V143-11-c05-negative-branches.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-005', 'API143-006', 'API143-007', 'API143-008'],
    ownerScenarioIds: ['O143-02'],
    uiReferences: ['UI143-C05'],
    negativeBranches: {
      unpaidBasicDecision: unpaidDecision,
      loggedOutOpen,
      loggedOutConfirm,
      loggedOutPaymentCount: loggedOutClient.store.list('payments').length,
      failedPayment,
      failedBasicDecision: failedDecision
    },
    apiCalls: [...client.calls, ...loggedOutClient.calls],
    dbReadback: {
      unpaidOrder: client.store.read('diagnosis_orders', 'order-v143-c05-unpaid'),
      failedOrder: client.store.read('diagnosis_orders', 'order-v143-c05-failed'),
      failedPayment: failedPayment.paymentReadback
    }
  });
});

test('V143-11 C05 records structural visual limitation and local-only guard evidence', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/preview/index.js',
    'scoremap-miniapp/pages/preview/index.wxml',
    'scoremap-miniapp/pages/preview/preview-basic-pay.test.js',
    'scoremap-miniapp/pages/preview/visual-preview-basic-pay.js',
    'scoremap-miniapp/services/api-client.js',
    'scoremap-miniapp/services/api.js',
    'scoremap-miniapp/services/local-fixture-store.js'
  ];
  const forbiddenRemoteFindings = [];
  const previewWxml = fs.readFileSync(path.join(projectRoot, 'scoremap-miniapp/pages/preview/index.wxml'), 'utf8');
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }

  assert.deepEqual(forbiddenRemoteFindings, []);
  assert.match(previewWxml, /<view wx:if="\{\{showPayModal\}\}" class="payment-mask">/);
  assert.match(previewWxml, /class="unlock-pill" data-action="pay" bindtap="onTap"/);
  assert.match(previewWxml, /class="floating-pay-button" data-action="pay" bindtap="onTap"/);
  assert.match(previewWxml, /解锁完整初判/);
  assert.match(previewWxml, /立即支付 1 元/);
  assert.match(
    fs.readFileSync(path.join(projectRoot, 'scoremap-miniapp/pages/preview/index.js'), 'utf8'),
    /showPayModal: shouldOpenPayModal/
  );

  writeEvidence('V143-11-c05-owner-local.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['REQ143-004', 'REQ143-007', 'REQ143-008'],
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      scenarios: ['O143-02', 'O143-11'],
      clickPath: [
        '/pages/preview/index',
        'unlock-basic',
        'half-screen-payment-modal',
        'confirm-basic-payment',
        '/pages/basic-result/index'
      ],
      apiEvidence: 'docs/auto-execute/evidence/frontend-page/V143-11-c05-payment-entitlement-c07.json',
      dbEvidence: 'docs/auto-execute/evidence/frontend-page/V143-11-c05-payment-entitlement-c07.json',
      limitation: 'This task records deterministic page-state and structural evidence. Full WeChat simulator screenshots and pixel diff remain outside this child task.'
    },
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      reference: 'docs/UI/小程序/v1.4.3-C05-初判预览-1元半屏支付.png',
      expectedVisualCommand: 'npm run visual:scoremap -- preview basic-pay',
      limitation: 'The focused C05 visual runner produces deterministic structural SVG evidence, not a real WeChat screenshot pixel PASS.'
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
