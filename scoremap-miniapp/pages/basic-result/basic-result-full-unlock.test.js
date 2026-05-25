const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFullUnlockPageState } = require('../full-unlock');
const { createBasicResultPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const evidenceDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'frontend-page');
const command = 'npm test -- basic-result-full-unlock';

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

test('basic result page renders complete C07 basic decision fields and routes to full unlock', () => {
  const client = createMiniappApiClient();
  const page = createBasicResultPageState(client, { orderId: 'order-t10-basic' });
  const load = page.loadBasicDecision();
  const state = page.getState();
  const unlock = page.unlockFull();

  assert.equal(state.route, '/pages/basic-result/index');
  assert.equal(load.status, 'BASIC_READY');
  assert.equal(load.apiStatus, 200);
  assert.ok(state.basicDecisionFields.summary.length > 20);
  assert.ok(state.basicDecisionFields.quality);
  assert.ok(state.basicDecisionFields.mainLossPoints.length >= 2);
  assert.ok(state.basicDecisionFields.priorityWeaknesses.length >= 2);
  assert.ok(state.basicDecisionFields.initialAdvice.length >= 2);
  assert.equal(state.upgradeCard.visible, true);
  assert.match(state.upgradeCard.priceText, /9\.9/);
  assert.doesNotMatch(state.upgradeCard.complianceText, /guaranteed score$/i);
  assert.equal(unlock.targetRoute, '/pages/full-unlock/index');
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-t10-basic/basic-decision'));

  writeEvidence('basic-result-full-unlock-route-controls.json', {
    status: 'PASS',
    command,
    requirementIds: ['R07', 'R08'],
    ownerScenarioIds: ['O03', 'O04'],
    uiReferences: ['UI-C07', 'UI-C08'],
    route: state.route,
    renderedState: state,
    pageJumpEvidence: [
      { controlId: 'load-basic-decision', result: load },
      { controlId: 'unlock-full', result: unlock }
    ],
    apiCalls: client.calls
  });
});

test('full unlock page uses local payment mock, callback, full generation, and DB readback', () => {
  const client = createMiniappApiClient();
  const basic = createBasicResultPageState(client, { orderId: 'order-t10-full' });
  basic.loadBasicDecision();
  const page = createFullUnlockPageState(client, { orderId: 'order-t10-full' });
  const state = page.getState();
  const back = page.backBasicResult();
  const paid = page.confirmFullPay();
  const snapshot = client.store.snapshot();

  assert.equal(state.route, '/pages/full-unlock/index');
  assert.equal(state.entitlementCard.current, 'basic');
  assert.equal(state.entitlementCard.target, 'full');
  assert.equal(state.benefits.length, 4);
  assert.match(state.entitlementCard.priceText, /9\.9/);
  assert.match(state.complianceText, /Local mock payment/);
  assert.doesNotMatch(state.complianceText, /guaranteed score$/i);
  assert.equal(back.targetRoute, '/pages/basic-result/index');
  assert.equal(paid.status, 'PAID');
  assert.equal(paid.targetRoute, '/pages/full-report-entry/index');
  assert.equal(paid.accessLevel, 'full');
  assert.equal(paid.paymentReadback.adapter, 'local-wechat-pay-mock');
  assert.equal(paid.paymentReadback.callbackAdapter, 'local-wechat-pay-mock');
  assert.equal(paid.generateFullStatus, 200);
  assert.equal(paid.fullReportStatus, 200);
  assert.equal(client.store.read('diagnosis_decisions', 'decision-order-t10-full-full').level, 'full');
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/payments/create' && call.payloadSummary.paymentType === 'full'));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/payments/wechat/callback'));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/diagnosis-orders/order-t10-full/generate-full'));
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-t10-full/full-report'));

  writeEvidence('basic-result-full-unlock-api-db.json', {
    status: 'PASS',
    command,
    requirementIds: ['R07', 'R08'],
    ownerScenarioIds: ['O03', 'O04'],
    apiEvidence: {
      basicDecision: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-t10-full/basic-decision'),
      paymentCreate: client.calls.find((call) => call.path === '/api/payments/create' && call.payloadSummary.paymentType === 'full'),
      paymentCallback: client.calls.find((call) => call.path === '/api/payments/wechat/callback'),
      generateFull: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-t10-full/generate-full'),
      fullReport: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-t10-full/full-report')
    },
    pageJumpEvidence: [
      { controlId: 'back-basic-result', result: back },
      { controlId: 'confirm-full-pay', result: paid }
    ],
    dbReadback: {
      order: client.store.read('diagnosis_orders', 'order-t10-full'),
      payment: paid.paymentReadback,
      basicDecision: client.store.read('diagnosis_decisions', 'decision-order-t10-full-basic'),
      fullDecision: client.store.read('diagnosis_decisions', 'decision-order-t10-full-full'),
      allPayments: snapshot.payments,
      allTasks: snapshot.ai_analysis_tasks
    }
  });
});

test('basic-result-full-unlock records owner limitation, visual limitation, and local-only guard evidence', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/basic-result/index.js',
    'scoremap-miniapp/pages/basic-result/basic-result-full-unlock.test.js',
    'scoremap-miniapp/pages/basic-result/visual-basic-result-full-unlock.js',
    'scoremap-miniapp/pages/full-unlock/index.js',
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
  writeEvidence('basic-result-full-unlock-owner-local.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['R07', 'R08', 'R15'],
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      scenarios: ['O03', 'O04'],
      clickPath: [
        '/pages/basic-result/index',
        'unlock-full',
        '/pages/full-unlock/index',
        'confirm-full-pay',
        '/pages/full-report-entry/index'
      ],
      apiEvidence: 'docs/auto-execute/evidence/frontend-page/basic-result-full-unlock-api-db.json',
      dbEvidence: 'docs/auto-execute/evidence/frontend-page/basic-result-full-unlock-api-db.json',
      limitation: 'T10 records deterministic C07/C08 owner actions. Full rendered O01-O12 owner E2E remains assigned to T15.'
    },
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      references: [
        'docs/UI/小程序/完整初判结果.png',
        'docs/UI/小程序/ChatGPT Image 2026年5月22日 23_02_21.png',
        'docs/UI/小程序/stitch_codex_development_blueprints/_4/screen.png'
      ],
      expectedVisualCommand: 'npm run visual:scoremap -- basic-result full-unlock',
      limitation: 'T10 visual runner produces deterministic structural artifacts and metrics. Pixel-perfect screenshot capture remains assigned to T14.'
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
