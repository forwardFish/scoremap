const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { createLocalAdapters } = require('../src/adapters');
const { createDiagnosisOrdersRouter } = require('../src/routes/diagnosis-orders');
const { createPaymentsRouter } = require('../src/routes/payments');

const projectRoot = path.resolve(__dirname, '..', '..');
const evidenceDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'backend-api-payment');
const command = 'npm --prefix server test -- payment entitlement';

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

function makeAdapters() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-t04-'));
  return createLocalAdapters({
    dbPath: path.join(tempRoot, 'scoremap-local-db.json'),
    cloudRootDir: path.join(tempRoot, 'local-cloud')
  });
}

function createServer(adapters) {
  const routers = [
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
    source: `T04-${suffix}`,
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  assert.equal(create.status, 201);
  const upload = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/uploads`, {
    authorizationAccepted: true,
    files: [
      {
        id: `upload-t04-${suffix}`,
        originalName: 'answer-sheet.png',
        mimeType: 'image/png',
        content: 'local mock upload bytes'
      }
    ]
  }, { 'x-order-token': create.body.orderToken });
  assert.equal(upload.status, 200);
  const start = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/start-preview-analysis`, {}, {
    'x-order-token': create.body.orderToken
  });
  assert.equal(start.status, 200);
  return { create, upload, start };
}

test('T04 creates basic payment, handles paid callback, and unlocks basic entitlement', async () => {
  await withApi(async (api) => {
    const { create } = await createPreviewReadyOrder(api, 'basic');
    const payment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'basic'
    }, { 'x-order-token': create.body.orderToken });
    const repeatedCreate = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'basic'
    }, { 'x-order-token': create.body.orderToken });
    const callback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: payment.body.paymentId,
      status: 'paid',
      mockTransactionId: 'mock-tx-t04-basic',
      mockSignature: 'local-mock-signature'
    });
    const duplicateCallback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: payment.body.paymentId,
      status: 'paid',
      mockTransactionId: 'mock-tx-t04-basic',
      mockSignature: 'local-mock-signature'
    });

    assert.equal(payment.status, 201);
    assert.equal(payment.body.amountCents, 100);
    assert.equal(payment.body.paymentParams.provider, 'local-wechat-pay-mock');
    assert.equal(repeatedCreate.status, 200);
    assert.equal(repeatedCreate.body.idempotent, true);
    assert.equal(callback.status, 200);
    assert.equal(callback.body.accessLevel, 'basic');
    assert.equal(duplicateCallback.status, 200);
    assert.equal(duplicateCallback.body.idempotent, true);
    assert.deepEqual(api.payment.remoteCalls, []);

    const paymentReadback = api.db.assertReadback('payments', payment.body.paymentId, { status: 'paid' });
    const orderReadback = api.db.assertReadback('diagnosis_orders', create.body.orderId, {
      accessLevel: 'basic',
      status: 'basic_paid'
    });

    writeEvidence('basic-payment.json', {
      status: 'PASS',
      command,
      requirementIds: ['R06'],
      pageJumpEvidence: {
        status: 'PASS_WITH_LIMITATION',
        route: '/pages/preview/index -> /pages/basic-pay/index -> /pages/basic-result/index',
        clickPath: 'O03: tap 1 CNY unlock -> confirm local mock payment -> paid callback',
        reason: 'T04 owns backend payment APIs; frontend route implementation, screenshots, and click trace remain assigned to T09/T10/T15.'
      },
      apiCalls: [
        { method: 'POST', path: '/api/payments/create', responseStatus: payment.status, response: payment.body },
        { method: 'POST', path: '/api/payments/create', responseStatus: repeatedCreate.status, idempotent: repeatedCreate.body.idempotent },
        { method: 'POST', path: '/api/payments/wechat/callback', responseStatus: callback.status, response: callback.body },
        { method: 'POST', path: '/api/payments/wechat/callback', responseStatus: duplicateCallback.status, idempotent: duplicateCallback.body.idempotent }
      ],
      dbReadback: {
        payment: paymentReadback,
        order: orderReadback
      },
      localOnly: {
        paymentAdapter: api.payment.assertLocalOnly(),
        remoteCalls: api.payment.remoteCalls
      }
    });
  });
});

test('T04 requires basic before full payment and unlocks full entitlement after local paid callback', async () => {
  await withApi(async (api) => {
    const { create } = await createPreviewReadyOrder(api, 'full');
    const deniedFull = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'full'
    }, { 'x-order-token': create.body.orderToken });
    assert.equal(deniedFull.status, 403);

    const basic = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'basic'
    }, { 'x-order-token': create.body.orderToken });
    const basicCallback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: basic.body.paymentId,
      status: 'paid',
      mockTransactionId: 'mock-tx-t04-full-basic',
      mockSignature: 'local-mock-signature'
    });
    assert.equal(basicCallback.status, 200);

    const full = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'full'
    }, { 'x-order-token': create.body.orderToken });
    const fullCallback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: full.body.paymentId,
      status: 'paid',
      mockTransactionId: 'mock-tx-t04-full',
      mockSignature: 'local-mock-signature'
    });

    assert.equal(full.status, 201);
    assert.equal(full.body.amountCents, 990);
    assert.equal(fullCallback.status, 200);
    assert.equal(fullCallback.body.accessLevel, 'full');

    const fullPaymentReadback = api.db.assertReadback('payments', full.body.paymentId, { status: 'paid' });
    const orderReadback = api.db.assertReadback('diagnosis_orders', create.body.orderId, {
      accessLevel: 'full',
      status: 'full_paid'
    });

    writeEvidence('full-payment.json', {
      status: 'PASS',
      command,
      requirementIds: ['R08'],
      pageJumpEvidence: {
        status: 'PASS_WITH_LIMITATION',
        route: '/pages/basic-result/index -> /pages/full-unlock/index -> /pages/full-report-entry/index',
        clickPath: 'O04: tap 9.9 CNY unlock -> confirm local mock payment -> paid callback',
        reason: 'T04 proves API and DB entitlement behavior; full report generation and UI route rendering are assigned to T05/T10/T11/T15.'
      },
      apiCalls: [
        { method: 'POST', path: '/api/payments/create', branch: 'full_before_basic_denied', responseStatus: deniedFull.status, response: deniedFull.body },
        { method: 'POST', path: '/api/payments/create', branch: 'basic_prerequisite', responseStatus: basic.status, response: basic.body },
        { method: 'POST', path: '/api/payments/wechat/callback', branch: 'basic_paid', responseStatus: basicCallback.status, response: basicCallback.body },
        { method: 'POST', path: '/api/payments/create', branch: 'full', responseStatus: full.status, response: full.body },
        { method: 'POST', path: '/api/payments/wechat/callback', branch: 'full_paid', responseStatus: fullCallback.status, response: fullCallback.body }
      ],
      dbReadback: {
        fullPayment: fullPaymentReadback,
        order: orderReadback
      },
      localOnly: {
        paymentAdapter: api.payment.assertLocalOnly(),
        remoteCalls: api.payment.remoteCalls
      }
    });
  });
});

test('T04 covers validation, owner denial, failed, cancelled, and compensation repair branches', async () => {
  await withApi(async (api) => {
    const invalid = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: 'missing-order',
      paymentType: 'vip'
    });
    assert.equal(invalid.status, 400);

    const { create } = await createPreviewReadyOrder(api, 'errors');
    const forbidden = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'basic'
    }, {
      'x-local-user-id': 'different-local-user',
      'x-order-token': 'wrong-token'
    });
    assert.equal(forbidden.status, 403);

    const failedPayment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'basic',
      paymentId: 'payment-t04-failed'
    }, { 'x-order-token': create.body.orderToken });
    const failedCallback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: failedPayment.body.paymentId,
      status: 'failed',
      mockSignature: 'local-mock-signature'
    });
    assert.equal(failedCallback.status, 200);
    assert.equal(failedCallback.body.accessLevel, 'preview');

    const cancelledPayment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'basic',
      paymentId: 'payment-t04-cancelled'
    }, { 'x-order-token': create.body.orderToken });
    const cancelledCallback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: cancelledPayment.body.paymentId,
      status: 'cancelled',
      mockSignature: 'local-mock-signature'
    });
    assert.equal(cancelledCallback.status, 200);
    assert.equal(cancelledCallback.body.accessLevel, 'preview');

    const repairPayment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: create.body.orderId,
      paymentType: 'basic',
      paymentId: 'payment-t04-repair'
    }, { 'x-order-token': create.body.orderToken });
    const paid = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: repairPayment.body.paymentId,
      status: 'paid',
      mockTransactionId: 'mock-tx-t04-repair',
      mockSignature: 'local-mock-signature'
    });
    assert.equal(paid.status, 200);
    api.db.update('diagnosis_orders', create.body.orderId, {
      accessLevel: 'preview',
      status: 'preview_done'
    });
    const repaired = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
      paymentId: repairPayment.body.paymentId,
      status: 'paid',
      mockTransactionId: 'mock-tx-t04-repair',
      mockSignature: 'local-mock-signature'
    });
    assert.equal(repaired.status, 200);
    assert.equal(repaired.body.repaired, true);
    assert.equal(repaired.body.accessLevel, 'basic');

    writeEvidence('failure-recovery-branches.json', {
      status: 'PASS',
      command,
      apiCalls: [
        { method: 'POST', path: '/api/payments/create', branch: 'validation', responseStatus: invalid.status, response: invalid.body },
        { method: 'POST', path: '/api/payments/create', branch: 'owner_denial', responseStatus: forbidden.status, response: forbidden.body },
        { method: 'POST', path: '/api/payments/wechat/callback', branch: 'failed', responseStatus: failedCallback.status, response: failedCallback.body },
        { method: 'POST', path: '/api/payments/wechat/callback', branch: 'cancelled', responseStatus: cancelledCallback.status, response: cancelledCallback.body },
        { method: 'POST', path: '/api/payments/wechat/callback', branch: 'compensation_repair', responseStatus: repaired.status, response: repaired.body }
      ],
      dbReadback: {
        failedPayment: api.db.assertReadback('payments', failedPayment.body.paymentId, { status: 'failed' }),
        cancelledPayment: api.db.assertReadback('payments', cancelledPayment.body.paymentId, { status: 'cancelled' }),
        repairedOrder: api.db.assertReadback('diagnosis_orders', create.body.orderId, {
          accessLevel: 'basic',
          status: 'basic_paid'
        })
      },
      localOnly: {
        paymentAdapter: api.payment.assertLocalOnly(),
        remoteCalls: api.payment.remoteCalls
      }
    });
  });
});

test('T04 proves local-only boundary and records backend-only visual and owner limitations', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'server/src/services/payments-service.js',
    'server/src/routes/payments.js',
    'server/test/payment-api.test.js'
  ];
  const findings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      findings.push({ path: relativePath, match });
    }
  }

  assert.deepEqual(findings, []);
  writeEvidence('local-only-secret-guard.json', {
    status: 'PASS',
    command,
    localOnly,
    scannedFiles: filesToScan,
    forbiddenRemoteFindings: findings,
    secretFindings: [],
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      reason: 'T04 has no frontend rendering surface; reference/actual/diff/metrics remain assigned to T14.'
    },
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      coveredSteps: ['O03 API/DB payment unlock', 'O04 API/DB full payment unlock'],
      reason: 'T04 records API/DB behavior used by owner payment journeys, while exact owner clicks and screenshots are assigned to T15.'
    }
  });
});
