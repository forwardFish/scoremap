const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');

const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { createLocalAdapters } = require('../../server/src/adapters');
const { createDiagnosisOrdersRouter } = require('../../server/src/routes/diagnosis-orders');
const { createPaymentsRouter } = require('../../server/src/routes/payments');
const { createReportsRouter } = require('../../server/src/routes/reports');
const { exportLocalData } = require('../../server/scripts/export-local-data');

const projectRoot = path.resolve(__dirname, '..', '..');
const evidenceRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'api-db-e2e');
const apiDbSummaryRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'api-db');
const command = 'npm run e2e:api-db';

const successPaths = [
  'POST /api/diagnosis-orders',
  'POST /api/diagnosis-orders/{orderId}/uploads',
  'POST /api/diagnosis-orders/{orderId}/start-preview-analysis',
  'GET /api/diagnosis-orders/{orderId}/analysis-progress',
  'GET /api/diagnosis-orders/{orderId}/preview-decision',
  'POST /api/payments/create',
  'POST /api/payments/wechat/callback',
  'GET /api/diagnosis-orders/{orderId}/basic-decision',
  'POST /api/diagnosis-orders/{orderId}/generate-full',
  'GET /api/diagnosis-orders/{orderId}/full-report',
  'POST /api/diagnosis-orders/{orderId}/save-report',
  'GET /api/my/reports',
  'POST /api/diagnosis-orders/{orderId}/feedback',
  'POST /api/diagnosis-orders/{orderId}/export-pdf',
  'GET /api/report-exports/{exportId}'
];

function rel(...parts) {
  return parts.join('/');
}

function writeJson(relativePath, payload) {
  const absolutePath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
  return relativePath;
}

function resetEvidenceDir() {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(apiDbSummaryRoot, { recursive: true });
  fs.rmSync(path.join(evidenceRoot, 'local-db-snapshot-source.json'), { force: true });
}

function makeAdapters() {
  resetEvidenceDir();
  return {
    ...createLocalAdapters({
      dbPath: path.join(evidenceRoot, 'local-db-snapshot-source.json'),
      cloudRootDir: path.join(evidenceRoot, 'local-cloud')
    }),
    exportRootDir: path.join(evidenceRoot, 'local-report-exports'),
    dataExportPath: path.join(evidenceRoot, 'operator-export.json')
  };
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

async function withApi(callback) {
  process.env.LOCAL_ONLY = 'true';
  process.env.SCOREMAP_ADAPTER_MODE = 'local-mock';
  const adapters = makeAdapters();
  const server = createServer(adapters);
  const address = await listen(server);
  try {
    return await callback({
      ...adapters,
      baseUrl: `http://127.0.0.1:${address.port}`,
      trace: []
    });
  } finally {
    await close(server);
  }
}

async function requestJson(api, method, pathname, body, headers = {}, branch = 'success') {
  const response = await fetch(`${api.baseUrl}${pathname}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const responseBody = await response.json();
  const traceItem = {
    branch,
    method,
    path: normalizePath(pathname),
    concretePath: pathname,
    payloadSummary: summarize(body),
    responseStatus: response.status,
    responseBody: summarizeResponse(responseBody)
  };
  api.trace.push(traceItem);
  return { status: response.status, body: responseBody, traceItem };
}

async function requestBadJson(api) {
  const response = await fetch(`${api.baseUrl}/api/diagnosis-orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{bad json'
  });
  const responseBody = await response.json();
  const traceItem = {
    branch: '5xx_bad_json',
    method: 'POST',
    path: 'POST /api/diagnosis-orders',
    concretePath: '/api/diagnosis-orders',
    payloadSummary: { malformedJson: true },
    responseStatus: response.status,
    responseBody
  };
  api.trace.push(traceItem);
  return { status: response.status, body: responseBody, traceItem };
}

async function createUploadedPreview(api, suffix) {
  const create = await requestJson(api, 'POST', '/api/diagnosis-orders', {
    source: `T16-${suffix}`,
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  assert.equal(create.status, 201);

  const upload = await requestJson(api, 'POST', `/api/diagnosis-orders/${create.body.orderId}/uploads`, {
    authorizationAccepted: true,
    files: [{
      id: `upload-t16-${suffix}`,
      originalName: `${suffix}.png`,
      mimeType: 'image/png',
      content: 'local mock answer sheet bytes'
    }]
  }, { 'x-order-token': create.body.orderToken });
  assert.equal(upload.status, 200);

  const start = await requestJson(api, 'POST', `/api/diagnosis-orders/${create.body.orderId}/start-preview-analysis`, {}, {
    'x-order-token': create.body.orderToken
  });
  assert.equal(start.status, 200);

  const progress = await requestJson(api, 'GET', `/api/diagnosis-orders/${create.body.orderId}/analysis-progress`, undefined, {
    'x-order-token': create.body.orderToken
  });
  const preview = await requestJson(api, 'GET', `/api/diagnosis-orders/${create.body.orderId}/preview-decision`, undefined, {
    'x-order-token': create.body.orderToken
  });
  assert.equal(progress.status, 200);
  assert.equal(preview.status, 200);
  return { create, upload, start, progress, preview };
}

async function pay(api, create, paymentType, suffix) {
  const payment = await requestJson(api, 'POST', '/api/payments/create', {
    orderId: create.body.orderId,
    paymentType,
    paymentId: `payment-t16-${paymentType}-${suffix}`
  }, { 'x-order-token': create.body.orderToken });
  assert.ok(payment.status === 201 || payment.status === 200);

  const callback = await requestJson(api, 'POST', '/api/payments/wechat/callback', {
    paymentId: payment.body.paymentId,
    status: 'paid',
    mockTransactionId: `mock-tx-t16-${paymentType}-${suffix}`,
    mockSignature: 'local-mock-signature'
  });
  assert.equal(callback.status, 200);
  return { payment, callback };
}

function dbReadbackSummary(db, orderId, paymentIds, feedbackId, exportId) {
  return {
    user: db.assertReadback('users', 'local-user-scoremap-t03', { role: 'parent_owner' }),
    order: db.assertReadback('diagnosis_orders', orderId, { accessLevel: 'full' }),
    upload: db.assertReadback('upload_files', 'upload-t16-main', { authorizationAccepted: true }),
    previewTask: db.find('ai_analysis_tasks', (row) => row.orderId === orderId && row.type === 'preview')[0],
    fullTask: db.find('ai_analysis_tasks', (row) => row.orderId === orderId && row.type === 'full')[0],
    previewDecision: db.assertReadback('diagnosis_decisions', `decision-${orderId}-preview`, { level: 'preview' }),
    basicDecision: db.assertReadback('diagnosis_decisions', `decision-${orderId}-basic`, { level: 'basic' }),
    fullDecision: db.assertReadback('diagnosis_decisions', `decision-${orderId}-full`, { level: 'full' }),
    payments: paymentIds.map((paymentId) => db.assertReadback('payments', paymentId, { status: 'paid' })),
    feedback: db.assertReadback('feedbacks', feedbackId, { orderId }),
    reportExport: db.assertReadback('report_exports', exportId, { status: 'ready' })
  };
}

function assertAllSuccessPathsCovered(trace) {
  const covered = new Set(
    trace
      .filter((item) => item.branch === 'success' && item.responseStatus >= 200 && item.responseStatus < 300)
      .map((item) => `${item.method} ${item.path}`)
  );
  const missing = successPaths.filter((item) => !covered.has(item));
  assert.deepEqual(missing, []);
  return successPaths.map((item) => ({ path: item, status: 'PASS' }));
}

function buildPageEvidence() {
  return [
    {
      status: 'PASS_WITH_LIMITATION',
      source: 'docs/auto-execute/evidence/owner/journey-summary.json',
      routes: [
        '/pages/index/index',
        '/pages/analysis/index',
        '/pages/preview/index',
        '/pages/basic-pay/index',
        '/pages/basic-result/index',
        '/pages/full-unlock/index',
        '/pages/full-report-entry/index',
        '/pages/full-report/index',
        '/pages/my/index',
        '/pages/reports/index'
      ],
      note: 'T16 verifies API/DB readback for route-backed controls; exact page clicks are inherited from the completed T15 owner evidence.'
    }
  ];
}

function buildVisualEvidence() {
  const visualSummary = rel('docs', 'auto-execute', 'evidence', 'visual-harness', 'summary.json');
  assert.ok(fs.existsSync(path.join(projectRoot, visualSummary)), `missing visual evidence ${visualSummary}`);
  return [
    {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      source: visualSummary,
      note: 'T16 is API/DB focused and reuses deterministic T14 SVG actual/diff/metrics artifacts; no new raster pixel comparison is claimed.'
    }
  ];
}

function buildOwnerEvidence() {
  const ownerSummary = rel('docs', 'auto-execute', 'evidence', 'owner', 'journey-summary.json');
  assert.ok(fs.existsSync(path.join(projectRoot, ownerSummary)), `missing owner evidence ${ownerSummary}`);
  return [
    {
      status: 'PASS',
      source: ownerSummary,
      scenarioRange: 'O01-O12',
      note: 'T15 owner journey evidence is the page-click source that T16 API/DB assertions read back against.'
    }
  ];
}

function scanLocalOnlyFiles() {
  const files = [
    'package.json',
    'tests/api/api-db-readback-e2e.test.js',
    'server/src/adapters/local-wechat-pay-mock.js',
    'server/src/adapters/local-tencent-cloud-mock.js',
    'server/src/db/local-json-db.js',
    'server/src/services/diagnosis-orders-service.js',
    'server/src/services/payments-service.js',
    'server/src/services/reports-service.js'
  ];
  return files.flatMap((file) => {
    const text = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    return scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS).map((match) => ({ file, match }));
  });
}

test('T16 API and DB readback E2E covers contract matrix success, error, timeout, export, owner, visual, and local-only evidence', async () => {
  await withApi(async (api) => {
    const localOnly = assertLocalOnlyEnvironment({
      LOCAL_ONLY: 'true',
      SCOREMAP_ADAPTER_MODE: 'local-mock'
    });

    const fixture = await createUploadedPreview(api, 'main');
    const basic = await pay(api, fixture.create, 'basic', 'main');
    const basicDecision = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/basic-decision`, undefined, {
      'x-order-token': fixture.create.body.orderToken
    });
    const full = await pay(api, fixture.create, 'full', 'main');
    const generate = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/generate-full`, {}, {
      'x-order-token': fixture.create.body.orderToken
    });
    const fullReport = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/full-report`, undefined, {
      'x-order-token': fixture.create.body.orderToken
    });
    const save = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/save-report`, {}, {
      'x-order-token': fixture.create.body.orderToken
    });
    const myReports = await requestJson(api, 'GET', '/api/my/reports', undefined);
    const feedback = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/feedback`, {
      feedbackId: 'feedback-t16-main',
      decisionLevel: 'full',
      rating: 5,
      tags: ['api-db-e2e'],
      text: 'Local T16 API DB readback feedback.'
    }, { 'x-order-token': fixture.create.body.orderToken });
    const pdf = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/export-pdf`, {
      exportId: 'report-export-t16-main'
    }, { 'x-order-token': fixture.create.body.orderToken });
    const pdfRead = await requestJson(api, 'GET', `/api/report-exports/${pdf.body.exportId}`, undefined);

    assert.equal(basicDecision.status, 200);
    assert.equal(generate.status, 200);
    assert.equal(fullReport.status, 200);
    assert.equal(save.status, 200);
    assert.equal(myReports.status, 200);
    assert.equal(feedback.status, 201);
    assert.equal(pdf.status, 201);
    assert.equal(pdfRead.status, 200);

    const invalidOrder = await requestJson(api, 'POST', '/api/diagnosis-orders', { source: 'missing-fields' }, {}, '4xx_validation');
    const wrongOwner = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/preview-decision`, undefined, {
      'x-local-user-id': 'different-local-user',
      'x-order-token': 'wrong-token'
    }, '4xx_owner_forbidden');
    const missingRoute = await requestJson(api, 'GET', '/api/not-found-route', undefined, {}, '4xx_not_found');
    const duplicateFullBeforeBasicFixture = await createUploadedPreview(api, 'full-denied');
    const deniedFull = await requestJson(api, 'POST', '/api/payments/create', {
      orderId: duplicateFullBeforeBasicFixture.create.body.orderId,
      paymentType: 'full'
    }, { 'x-order-token': duplicateFullBeforeBasicFixture.create.body.orderToken }, '4xx_entitlement');
    const low = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/start-preview-analysis`, {
      simulate: 'failure',
      retry: true,
      taskId: 'task-t16-failure-branch'
    }, { 'x-order-token': fixture.create.body.orderToken }, '4xx_low_quality');
    const timeoutFixture = await createUploadedPreview(api, 'timeout');
    const timeout = await requestJson(api, 'POST', `/api/diagnosis-orders/${timeoutFixture.create.body.orderId}/start-preview-analysis`, {
      simulate: 'timeout',
      retry: true,
      taskId: 'task-t16-timeout'
    }, { 'x-order-token': timeoutFixture.create.body.orderToken }, 'timeout');
    const badJson = await requestBadJson(api);

    assert.equal(invalidOrder.status, 400);
    assert.equal(wrongOwner.status, 403);
    assert.equal(missingRoute.status, 404);
    assert.equal(deniedFull.status, 403);
    assert.equal(low.status, 422);
    assert.equal(timeout.status, 202);
    assert.equal(badJson.status, 500);

    const dbReadback = dbReadbackSummary(api.db, fixture.create.body.orderId, [
      basic.payment.body.paymentId,
      full.payment.body.paymentId
    ], feedback.body.feedbackId, pdf.body.exportId);
    const operatorExport = exportLocalData({
      dbPath: path.join(evidenceRoot, 'local-db-snapshot-source.json'),
      outputPath: path.join(evidenceRoot, 'operator-export.json')
    });
    const snapshot = api.db.snapshot();
    const successCoverage = assertAllSuccessPathsCovered(api.trace);
    const forbiddenRemoteFindings = scanLocalOnlyFiles();
    assert.deepEqual(forbiddenRemoteFindings, []);
    assert.deepEqual(api.cloud.remoteCalls, []);
    assert.deepEqual(api.payment.remoteCalls, []);
    assert.ok(fs.existsSync(api.db.read('report_exports', pdf.body.exportId).filePath));

    const apiTracePath = writeJson(rel('docs', 'auto-execute', 'evidence', 'api-db-e2e', 'api-trace.json'), {
      taskId: 'T16',
      status: 'PASS',
      command,
      apiCallCount: api.trace.length,
      successCoverage,
      errorCoverage: [
        { branch: '4xx_validation', responseStatus: invalidOrder.status },
        { branch: '4xx_owner_forbidden', responseStatus: wrongOwner.status },
        { branch: '4xx_not_found', responseStatus: missingRoute.status },
        { branch: '4xx_entitlement', responseStatus: deniedFull.status },
        { branch: '4xx_low_quality', responseStatus: low.status },
        { branch: 'timeout', responseStatus: timeout.status, code: timeout.body.errorCode },
        { branch: '5xx_bad_json', responseStatus: badJson.status, code: badJson.body.code }
      ],
      calls: api.trace
    });
    const dbSnapshotPath = writeJson(rel('docs', 'auto-execute', 'evidence', 'api-db-e2e', 'db-snapshot.json'), {
      taskId: 'T16',
      status: 'PASS',
      tables: Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.length])),
      readback: dbReadback,
      operatorExport: {
        path: rel('docs', 'auto-execute', 'evidence', 'api-db-e2e', 'operator-export.json'),
        tables: Object.fromEntries(Object.entries(operatorExport.tables).map(([table, rows]) => [table, rows.length]))
      }
    });
    const assertionsPath = writeJson(rel('docs', 'auto-execute', 'evidence', 'api-db-e2e', 'assertions.json'), {
      taskId: 'T16',
      status: 'PASS',
      requirementIds: ['R02', 'R06', 'R08', 'R09', 'R10', 'R11', 'R12', 'R15'],
      pageEvidence: buildPageEvidence(),
      apiEvidence: [apiTracePath],
      dbEvidence: [dbSnapshotPath],
      visualEvidence: buildVisualEvidence(),
      ownerJourneyEvidence: buildOwnerEvidence(),
      localOnlyEvidence: [{
        status: 'PASS',
        environment: localOnly,
        paymentAdapter: api.payment.assertLocalOnly(),
        cloudAdapter: api.cloud.assertLocalOnly(),
        forbiddenRemoteFindings,
        remoteCalls: []
      }]
    });
    const summary = {
      taskId: 'T16',
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      command,
      evidence: {
        apiTrace: apiTracePath,
        dbSnapshot: dbSnapshotPath,
        assertions: assertionsPath
      },
      apiCallCount: api.trace.length,
      successPathCount: successCoverage.length,
      dbTables: Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.length])),
      localOnly: {
        LOCAL_ONLY: 'true',
        SCOREMAP_ADAPTER_MODE: 'local-mock',
        paymentAdapter: 'local-wechat-pay-mock',
        cloudAdapter: 'local-tencent-cloud-mock',
        databaseAdapter: 'local-json-db',
        remoteCalls: []
      },
      visualStatus: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      knownGaps: [{
        status: 'MANUAL_REVIEW_REQUIRED',
        reason: 'T16 verifies API and local DB readback. It references existing T14 deterministic visual artifacts and T15 owner click evidence, but does not create new live miniapp screenshots or raster pixel diffs.'
      }]
    };
    const summaryPath = writeJson(rel('docs', 'auto-execute', 'evidence', 'api-db-e2e', 'summary.json'), summary);
    writeJson(rel('docs', 'auto-execute', 'evidence', 'api-db', 'summary.json'), {
      ...summary,
      canonicalEvidence: summaryPath
    });
  });
});

function normalizePath(pathname) {
  if (pathname === '/api/diagnosis-orders') return '/api/diagnosis-orders';
  if (pathname === '/api/payments/create') return '/api/payments/create';
  if (pathname === '/api/payments/wechat/callback') return '/api/payments/wechat/callback';
  if (pathname === '/api/my/reports') return '/api/my/reports';
  if (pathname.startsWith('/api/report-exports/')) return '/api/report-exports/{exportId}';
  return pathname
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/uploads$/, '/api/diagnosis-orders/{orderId}/uploads')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/start-preview-analysis$/, '/api/diagnosis-orders/{orderId}/start-preview-analysis')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/analysis-progress$/, '/api/diagnosis-orders/{orderId}/analysis-progress')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/preview-decision$/, '/api/diagnosis-orders/{orderId}/preview-decision')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/basic-decision$/, '/api/diagnosis-orders/{orderId}/basic-decision')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/generate-full$/, '/api/diagnosis-orders/{orderId}/generate-full')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/full-report$/, '/api/diagnosis-orders/{orderId}/full-report')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/save-report$/, '/api/diagnosis-orders/{orderId}/save-report')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/feedback$/, '/api/diagnosis-orders/{orderId}/feedback')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/export-pdf$/, '/api/diagnosis-orders/{orderId}/export-pdf');
}

function summarize(payload) {
  if (payload === undefined) return {};
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => {
    if (Array.isArray(value)) return [key, `array(${value.length})`];
    if (value && typeof value === 'object') return [key, `object(${Object.keys(value).length})`];
    return [key, value];
  }));
}

function summarizeResponse(body) {
  if (!body || typeof body !== 'object') return body;
  const summary = {};
  for (const key of ['status', 'code', 'orderId', 'taskId', 'paymentId', 'accessLevel', 'exportId', 'feedbackId', 'saved', 'ok', 'idempotent', 'errorCode']) {
    if (Object.prototype.hasOwnProperty.call(body, key)) summary[key] = body[key];
  }
  if (body.items) summary.items = `array(${body.items.length})`;
  if (body.decision) summary.decision = `object(${Object.keys(body.decision).length})`;
  return summary;
}
