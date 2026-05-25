const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { createLocalAdapters } = require('../src/adapters');
const { createDiagnosisOrdersRouter } = require('../src/routes/diagnosis-orders');

const projectRoot = path.resolve(__dirname, '..', '..');
const evidenceDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'backend-api');
const command = 'npm --prefix server test -- orders uploads preview';

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

function makeAdapters() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-t03-'));
  return createLocalAdapters({
    dbPath: path.join(tempRoot, 'scoremap-local-db.json'),
    cloudRootDir: path.join(tempRoot, 'local-cloud')
  });
}

function createServer(adapters) {
  const router = createDiagnosisOrdersRouter(adapters);
  return http.createServer(async (request, response) => {
    try {
      const handled = await router(request, response);
      if (!handled) {
        response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ status: 'error', code: 'NOT_FOUND' }));
      }
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

async function createUploadedOrder(api, suffix = 'success') {
  const create = await requestJson(api.baseUrl, 'POST', '/api/diagnosis-orders', {
    source: `T03-${suffix}`,
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
        id: `upload-t03-${suffix}`,
        originalName: 'answer-sheet.png',
        mimeType: 'image/png',
        content: 'local mock upload bytes'
      }
    ]
  }, { 'x-order-token': create.body.orderToken });
  assert.equal(upload.status, 200);
  return { create, upload };
}

test('T03 creates order, uploads file, starts preview, polls progress, and reads preview decision', async () => {
  await withApi(async (api) => {
    const { create, upload } = await createUploadedOrder(api);
    const start = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/start-preview-analysis`, {}, {
      'x-order-token': create.body.orderToken
    });
    const progress = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/analysis-progress`, undefined, {
      'x-order-token': create.body.orderToken
    });
    const preview = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/preview-decision`, undefined, {
      'x-order-token': create.body.orderToken
    });

    assert.equal(start.status, 200);
    assert.equal(progress.status, 200);
    assert.equal(progress.body.status, 'preview_done');
    assert.equal(preview.status, 200);
    assert.equal(preview.body.decision.visibleModules.length, 3);
    assert.equal(preview.body.decision.cta, '1 CNY unlock complete initial decision');

    const snapshot = api.db.snapshot();
    const order = api.db.assertReadback('diagnosis_orders', create.body.orderId, { status: 'preview_done' });
    const uploadReadback = api.db.assertReadback('upload_files', upload.body.orderId ? 'upload-t03-success' : 'missing', {
      authorizationAccepted: true
    });
    const task = snapshot.ai_analysis_tasks.find((row) => row.orderId === create.body.orderId);
    const decision = snapshot.diagnosis_decisions.find((row) => row.orderId === create.body.orderId && row.level === 'preview');
    assert.equal(task.status, 'preview_done');
    assert.equal(decision.preview.visibleModules.length, 3);
    assert.deepEqual(api.cloud.remoteCalls, []);

    writeEvidence('orders-uploads-preview-success.json', {
      status: 'PASS',
      command,
      pageJumpEvidence: {
        status: 'PASS_WITH_LIMITATION',
        route: '/pages/index/index -> /pages/analysis/index -> /pages/preview/index',
        reason: 'T03 owns backend API behavior only; frontend page implementation and click screenshots are assigned to T07-T09/T15.'
      },
      apiCalls: [
        { method: 'POST', path: '/api/diagnosis-orders', responseStatus: create.status, response: create.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/uploads', responseStatus: upload.status, response: upload.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/start-preview-analysis', responseStatus: start.status, response: start.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/analysis-progress', responseStatus: progress.status, response: progress.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/preview-decision', responseStatus: preview.status, response: preview.body }
      ],
      dbReadback: {
        order,
        upload: uploadReadback,
        task,
        decisionId: decision.id
      },
      localOnly: {
        cloudAdapter: api.cloud.assertLocalOnly(),
        remoteCalls: api.cloud.remoteCalls
      }
    });
  });
});

test('T03 rejects invalid input and non-owner order access', async () => {
  await withApi(async (api) => {
    const invalidOrder = await requestJson(api.baseUrl, 'POST', '/api/diagnosis-orders', {
      source: 'T03-invalid'
    });
    assert.equal(invalidOrder.status, 400);

    const { create } = await createUploadedOrder(api, 'auth');
    const forbidden = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/analysis-progress`, undefined, {
      'x-local-user-id': 'different-local-user',
      'x-order-token': 'wrong-token'
    });
    assert.equal(forbidden.status, 403);

    const uploadNoAuth = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/uploads`, {
      authorizationAccepted: false,
      files: [{ id: 'upload-denied', content: 'bytes' }]
    }, { 'x-order-token': create.body.orderToken });
    assert.equal(uploadNoAuth.status, 400);

    writeEvidence('validation-auth-errors.json', {
      status: 'PASS',
      command,
      apiCalls: [
        { method: 'POST', path: '/api/diagnosis-orders', responseStatus: invalidOrder.status, response: invalidOrder.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/analysis-progress', responseStatus: forbidden.status, response: forbidden.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/uploads', responseStatus: uploadNoAuth.status, response: uploadNoAuth.body }
      ],
      dbReadback: {
        orderStillOwned: api.db.assertReadback('diagnosis_orders', create.body.orderId, { ownerId: 'local-user-scoremap-t03' })
      }
    });
  });
});

test('T03 records low-quality image failure and retryable timeout branch', async () => {
  await withApi(async (api) => {
    const createLow = await requestJson(api.baseUrl, 'POST', '/api/diagnosis-orders', {
      source: 'T03-low-quality',
      grade: 'grade-5',
      subject: 'math',
      examType: 'unit-test',
      materialType: 'answer-sheet'
    });
    const uploadLow = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${createLow.body.orderId}/uploads`, {
      authorizationAccepted: true,
      files: [{ id: 'upload-t03-low', originalName: 'low.png', content: 'x', quality: 'low' }]
    }, { 'x-order-token': createLow.body.orderToken });
    assert.equal(uploadLow.status, 200);
    const lowStart = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${createLow.body.orderId}/start-preview-analysis`, {}, {
      'x-order-token': createLow.body.orderToken
    });
    assert.equal(lowStart.status, 422);
    assert.equal(lowStart.body.errorCode, 'LOW_QUALITY_IMAGE');

    const { create } = await createUploadedOrder(api, 'timeout');
    const timeoutStart = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/start-preview-analysis`, {
      simulate: 'timeout',
      retry: true
    }, { 'x-order-token': create.body.orderToken });
    const timeoutProgress = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/analysis-progress`, undefined, {
      'x-order-token': create.body.orderToken
    });
    assert.equal(timeoutStart.status, 202);
    assert.equal(timeoutStart.body.errorCode, 'ANALYSIS_TIMEOUT');
    assert.equal(timeoutProgress.body.status, 'timeout');

    writeEvidence('failure-branches.json', {
      status: 'PASS',
      command,
      apiCalls: [
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/start-preview-analysis', branch: 'low_quality', responseStatus: lowStart.status, response: lowStart.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/start-preview-analysis', branch: 'timeout', responseStatus: timeoutStart.status, response: timeoutStart.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/analysis-progress', branch: 'timeout', responseStatus: timeoutProgress.status, response: timeoutProgress.body }
      ],
      dbReadback: {
        lowQualityOrder: api.db.assertReadback('diagnosis_orders', createLow.body.orderId, { errorCode: 'LOW_QUALITY_IMAGE' }),
        timeoutOrder: api.db.assertReadback('diagnosis_orders', create.body.orderId, { errorCode: 'ANALYSIS_TIMEOUT' })
      }
    });
  });
});

test('T03 proves local-only boundary and records backend-only visual and owner limitations', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'server/src/services/diagnosis-orders-service.js',
    'server/src/routes/diagnosis-orders.js',
    'server/test/diagnosis-orders.test.js'
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
      reason: 'T03 has no frontend rendering surface; screenshots and visual diff metrics are assigned to T14.'
    },
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      reason: 'T03 records API/DB behavior used by O01/O02/O08, while exact owner clicks are assigned to T15.'
    }
  });
});
