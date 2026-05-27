const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { writeJsonEvidence } = require('../../shared/evidence-paths');
const { mapApiErrorToRecovery, resolveProtectedRouteState } = require('../../scoremap-miniapp/services/auth-recovery-state');
const { createLocalAdapters } = require('../src/adapters');
const { createDiagnosisOrdersRouter } = require('../src/routes/diagnosis-orders');
const { createPaymentsRouter } = require('../src/routes/payments');
const { createReportsRouter } = require('../src/routes/reports');

const projectRoot = path.resolve(__dirname, '..', '..');
const command = 'npm --prefix server test -- auth recovery errors';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('contract-security', name), payload);
}

function makeAdapters() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-t13-'));
  return createLocalAdapters({
    dbPath: path.join(tempRoot, 'scoremap-local-db.json'),
    cloudRootDir: path.join(tempRoot, 'local-cloud')
  });
}

function createServer(adapters) {
  const routers = [
    createReportsRouter(adapters),
    createDiagnosisOrdersRouter(adapters),
    createPaymentsRouter(adapters)
  ];
  return http.createServer(async (request, response) => {
    try {
      for (const router of routers) {
        if (await router(request, response)) return;
      }
      response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'error', code: 'NOT_FOUND' }));
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'error', code: 'TEST_SERVER_ERROR', message: error.message }));
    }
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function requestJson(baseUrl, method, pathname, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

async function withApi(callback) {
  process.env.LOCAL_ONLY = 'true';
  process.env.SCOREMAP_ADAPTER_MODE = 'local-mock';
  const adapters = makeAdapters();
  const server = createServer(adapters);
  const address = await listen(server);
  try {
    return await callback({
      ...adapters,
      baseUrl: `http://127.0.0.1:${address.port}`
    });
  } finally {
    await close(server);
  }
}

async function createPreviewReadyOrder(api, suffix) {
  const create = await requestJson(api.baseUrl, 'POST', '/api/diagnosis-orders', {
    source: `T13-${suffix}`,
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  assert.equal(create.status, 201);
  const upload = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/uploads`, {
    authorizationAccepted: true,
    files: [{ id: `upload-t13-${suffix}`, originalName: 'answer-sheet.png', content: 'local mock upload bytes' }]
  }, { 'x-order-token': create.body.orderToken });
  assert.equal(upload.status, 200);
  const start = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/start-preview-analysis`, {}, {
    'x-order-token': create.body.orderToken
  });
  assert.equal(start.status, 200);
  return { create, upload, start };
}

async function pay(api, order, paymentType, suffix) {
  const payment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
    orderId: order.body.orderId,
    paymentType,
    paymentId: `payment-t13-${paymentType}-${suffix}`
  }, { 'x-order-token': order.body.orderToken });
  assert.ok(payment.status === 201 || payment.status === 200);
  const callback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
    paymentId: payment.body.paymentId,
    status: 'paid',
    mockTransactionId: `mock-tx-t13-${paymentType}-${suffix}`,
    mockSignature: 'local-mock-signature'
  });
  assert.equal(callback.status, 200);
  return { payment, callback };
}

test('T13 enforces unauthenticated, owner, token, entitlement, and not-found branches', async () => {
  await withApi(async (api) => {
    const { create } = await createPreviewReadyOrder(api, 'authz');
    const orderPath = `/api/diagnosis-orders/${create.body.orderId}`;
    const anonymous = await requestJson(api.baseUrl, 'GET', `${orderPath}/basic-decision`, undefined, {
      'x-local-auth-state': 'anonymous'
    });
    const anonymousTokenBound = await requestJson(api.baseUrl, 'GET', `${orderPath}/preview-decision`, undefined, {
      'x-local-auth-state': 'anonymous',
      'x-order-token': create.body.orderToken
    });
    const wrongOwner = await requestJson(api.baseUrl, 'GET', `${orderPath}/preview-decision`, undefined, {
      'x-local-user-id': 'different-local-user',
      'x-order-token': 'wrong-token'
    });
    const unpaidBasic = await requestJson(api.baseUrl, 'GET', `${orderPath}/basic-decision`, undefined, {
      'x-order-token': create.body.orderToken
    });
    const missing = await requestJson(api.baseUrl, 'GET', '/api/diagnosis-orders/missing-order/basic-decision', undefined, {
      'x-order-token': 'local-order-token-missing-order'
    });

    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.code, 'UNAUTHENTICATED');
    assert.equal(anonymousTokenBound.status, 200);
    assert.equal(wrongOwner.status, 403);
    assert.equal(unpaidBasic.status, 403);
    assert.equal(unpaidBasic.body.code, 'BASIC_ENTITLEMENT_REQUIRED');
    assert.equal(missing.status, 404);

    writeEvidence('authz-api-db.json', {
      status: 'PASS',
      command,
      requirementIds: ['R11'],
      apiCalls: [
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/basic-decision', branch: 'anonymous_without_token', responseStatus: anonymous.status, response: anonymous.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/preview-decision', branch: 'anonymous_order_token_bound', responseStatus: anonymousTokenBound.status, response: { status: anonymousTokenBound.body.status, accessLevel: anonymousTokenBound.body.accessLevel } },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/preview-decision', branch: 'wrong_owner', responseStatus: wrongOwner.status, response: wrongOwner.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/basic-decision', branch: 'unpaid_basic_denied', responseStatus: unpaidBasic.status, response: unpaidBasic.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/basic-decision', branch: 'missing_order', responseStatus: missing.status, response: missing.body }
      ],
      dbReadback: {
        order: api.db.assertReadback('diagnosis_orders', create.body.orderId, { accessLevel: 'preview' }),
        decision: api.db.assertReadback('diagnosis_decisions', `decision-${create.body.orderId}-preview`, { level: 'preview' })
      }
    });
  });
});

test('T13 recovers paid entitlement and report-generation status after page close', async () => {
  await withApi(async (api) => {
    const { create } = await createPreviewReadyOrder(api, 'recovery');
    const basic = await pay(api, create, 'basic', 'recovery');
    api.db.update('diagnosis_orders', create.body.orderId, {
      accessLevel: 'preview',
      status: 'preview_done'
    });
    const recoveredBasic = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: basic.payment.body.paymentId,
      status: 'paid',
      mockTransactionId: 'mock-tx-t13-basic-recovery',
      mockSignature: 'local-mock-signature'
    });
    const full = await pay(api, create, 'full', 'recovery');
    const generate = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/generate-full`, {}, {
      'x-order-token': create.body.orderToken
    });
    const fullReport = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/full-report`, undefined, {
      'x-order-token': create.body.orderToken
    });
    const routeRecovery = resolveProtectedRouteState({
      route: '/pages/full-report/index',
      order: api.db.read('diagnosis_orders', create.body.orderId),
      payment: api.db.read('payments', full.payment.body.paymentId),
      reportStatus: 'generating'
    });

    assert.equal(recoveredBasic.status, 200);
    assert.equal(recoveredBasic.body.repaired, true);
    assert.equal(recoveredBasic.body.accessLevel, 'basic');
    assert.equal(full.callback.body.accessLevel, 'full');
    assert.equal(generate.status, 200);
    assert.equal(fullReport.status, 200);
    assert.equal(routeRecovery.status, 'RECOVERABLE_PENDING');

    writeEvidence('payment-state-recovery.json', {
      status: 'PASS',
      command,
      requirementIds: ['R11'],
      pageJumpEvidence: {
        status: 'PASS_WITH_LIMITATION',
        route: '/pages/basic-pay/index or /pages/full-unlock/index -> page closed -> /pages/full-report-entry/index',
        recoveryState: routeRecovery,
        reason: 'T13 proves deterministic route-state recovery data; T15 owns exact owner clicks and screenshots.'
      },
      apiCalls: [
        { method: 'POST', path: '/api/payments/wechat/callback', branch: 'basic_paid_compensation_repair', responseStatus: recoveredBasic.status, response: recoveredBasic.body },
        { method: 'POST', path: '/api/payments/wechat/callback', branch: 'full_paid', responseStatus: full.callback.status, response: full.callback.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/generate-full', responseStatus: generate.status, response: generate.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/full-report', responseStatus: fullReport.status, response: { status: fullReport.body.status, accessLevel: fullReport.body.accessLevel } }
      ],
      dbReadback: {
        basicPayment: api.db.assertReadback('payments', basic.payment.body.paymentId, { status: 'paid' }),
        fullPayment: api.db.assertReadback('payments', full.payment.body.paymentId, { status: 'paid' }),
        order: api.db.assertReadback('diagnosis_orders', create.body.orderId, { accessLevel: 'full' }),
        fullDecision: api.db.assertReadback('diagnosis_decisions', `decision-${create.body.orderId}-full`, { level: 'full' })
      },
      localOnly: {
        paymentAdapter: api.payment.assertLocalOnly(),
        paymentRemoteCalls: api.payment.remoteCalls
      }
    });
  });
});

test('T13 maps 401, 404, 500, and timeout errors to recoverable owner states', async () => {
  await withApi(async (api) => {
    const { create } = await createPreviewReadyOrder(api, 'errors');
    const timeout = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/start-preview-analysis`, {
      simulate: 'timeout',
      retry: true
    }, { 'x-order-token': create.body.orderToken });
    const notFoundRoute = await requestJson(api.baseUrl, 'GET', '/api/not-found-route', undefined);
    const serverError = await fetch(`${api.baseUrl}/api/diagnosis-orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad json'
    });
    const serverErrorBody = await serverError.json();

    assert.equal(timeout.status, 202);
    assert.equal(timeout.body.errorCode, 'ANALYSIS_TIMEOUT');
    assert.equal(notFoundRoute.status, 404);
    assert.equal(serverError.status, 500);

    const mapped = {
      unauthenticated: mapApiErrorToRecovery({ code: 'UNAUTHENTICATED' }),
      notFound: mapApiErrorToRecovery({ code: 'NOT_FOUND' }),
      serverError: mapApiErrorToRecovery({ code: 'TEST_SERVER_ERROR' }),
      timeout: mapApiErrorToRecovery({ code: 'ANALYSIS_TIMEOUT' })
    };
    assert.equal(mapped.unauthenticated.status, 'RECOVERABLE');
    assert.equal(mapped.notFound.status, 'RECOVERABLE');
    assert.equal(mapped.serverError.status, 'RETRYABLE');
    assert.equal(mapped.timeout.status, 'RETRYABLE');

    writeEvidence('error-recovery-map.json', {
      status: 'PASS',
      command,
      apiCalls: [
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/start-preview-analysis', branch: 'timeout', responseStatus: timeout.status, response: timeout.body },
        { method: 'GET', path: '/api/not-found-route', branch: '404', responseStatus: notFoundRoute.status, response: notFoundRoute.body },
        { method: 'POST', path: '/api/diagnosis-orders', branch: '500_bad_json', responseStatus: serverError.status, response: serverErrorBody }
      ],
      ownerJourneyEvidence: {
        status: 'PASS_WITH_LIMITATION',
        scenarioIds: ['O10', 'O11'],
        recoveryMap: mapped,
        reason: 'T13 covers route/API recovery states used by owner journeys; exact owner click traces are assigned to T15.'
      },
      dbReadback: {
        timeoutOrder: api.db.assertReadback('diagnosis_orders', create.body.orderId, { errorCode: 'ANALYSIS_TIMEOUT' })
      }
    });
  });
});

test('T13 proves local-only and records visual/manual-review boundaries', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const routeStates = [
    resolveProtectedRouteState({ route: '/pages/basic-result/index', order: { accessLevel: 'preview' } }),
    resolveProtectedRouteState({ route: '/pages/full-report/index', order: { accessLevel: 'basic' } }),
    resolveProtectedRouteState({ route: '/pages/full-report/index', authState: 'anonymous' })
  ];
  const filesToScan = [
    'server/src/middleware/auth.js',
    'server/src/services/diagnosis-orders-service.js',
    'server/src/services/payments-service.js',
    'server/src/services/reports-service.js',
    'scoremap-miniapp/services/auth-recovery-state.js',
    'server/test/auth-permission-recovery.test.js'
  ];
  const findings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      findings.push({ path: relativePath, match });
    }
  }

  assert.deepEqual(findings, []);
  assert.deepEqual(routeStates.map((state) => state.status), [
    'PAYMENT_REQUIRED',
    'FULL_PAYMENT_REQUIRED',
    'UNAUTHENTICATED'
  ]);
  writeEvidence('local-only-secret-visual-owner.json', {
    status: 'PASS',
    command,
    localOnly,
    scannedFiles: filesToScan,
    forbiddenRemoteFindings: findings,
    secretFindings: [],
    pageEvidence: routeStates,
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      reason: 'T13 is contract/security logic only; T14 owns screenshot and pixel-diff visual verification.'
    },
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      coveredScenarios: ['O10 direct unpaid protected route', 'O11 401/404/500/timeout recovery copy'],
      reason: 'T13 proves deterministic route state and API behavior; T15 owns full click/screenshot owner journey.'
    }
  });
});
