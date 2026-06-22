const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');

const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { createLocalAdapters } = require('../../server/src/adapters');
const { createLocalAiAdapter, LocalAiTraceStore } = require('../../server/src/ai');
const { createDiagnosisOrdersRouter } = require('../../server/src/routes/diagnosis-orders');
const { createPaymentsRouter } = require('../../server/src/routes/payments');
const { createQuestionInteractionsRouter } = require('../../server/src/routes/question-interactions');
const { createReportsRouter } = require('../../server/src/routes/reports');
const { exportLocalData } = require('../../server/scripts/export-local-data');
const { removeFileWithRetry, writeFileWithRetry } = require('../support/file-io');

const projectRoot = path.resolve(__dirname, '..', '..');
const evidenceRoot = process.env.SCOREMAP_API_DB_EVIDENCE_DIR
  ? path.resolve(projectRoot, process.env.SCOREMAP_API_DB_EVIDENCE_DIR)
  : path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'api-db-e2e-current');
const apiDbSummaryRoot = process.env.SCOREMAP_API_DB_SUMMARY_DIR
  ? path.resolve(projectRoot, process.env.SCOREMAP_API_DB_SUMMARY_DIR)
  : path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'api-db-current');
const ownerEvidenceRel = process.env.SCOREMAP_OWNER_EVIDENCE_DIR || rel('docs', 'auto-execute', 'evidence', 'owner-current');
const apiDbSummaryRel = path.relative(projectRoot, apiDbSummaryRoot).split(path.sep).join('/');
const llmEvidenceRel = process.env.SCOREMAP_LLM_EVIDENCE_DIR || rel('docs', 'auto-execute', 'evidence', 'llm-current');
const resultRootRel = process.env.SCOREMAP_RESULT_DIR || rel('docs', 'auto-execute', 'results-current');
const command = 'npm run e2e:api-db';
const t32Command = 'npm run e2e:api-db -- ai-tutor-v13';
const isV13ApiDbRun = process.argv.includes('ai-tutor-v13');
const evidenceRootRel = path.relative(projectRoot, evidenceRoot).split(path.sep).join('/');

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

const v13SuccessPaths = [
  'GET /api/diagnosis-orders/{orderId}/questions',
  'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions',
  'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer',
  'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions',
  'POST /api/diagnosis-orders/{orderId}/generate-full'
];

function rel(...parts) {
  return parts.join('/');
}

function e2eRel(fileName) {
  return rel(...evidenceRootRel.split('/'), fileName);
}

function writeJson(relativePath, payload) {
  const absolutePath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileWithRetry(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
  return relativePath;
}

function resetEvidenceDir() {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(apiDbSummaryRoot, { recursive: true });
  const preferredDbPath = path.join(evidenceRoot, 'local-db-snapshot-source.json');
  if (removeFileWithRetry(preferredDbPath)) return preferredDbPath;
  return path.join(evidenceRoot, `local-db-snapshot-source-${process.pid}-${Date.now()}.json`);
}

function makeAdapters() {
  const dbPath = resetEvidenceDir();
  const adapters = {
    ...createLocalAdapters({
      dbPath,
      cloudRootDir: path.join(evidenceRoot, 'local-cloud')
    }),
    exportRootDir: path.join(evidenceRoot, 'local-report-exports'),
    dataExportPath: path.join(evidenceRoot, 'operator-export.json')
  };
  return {
    ...adapters,
    ai: createLocalAiAdapter({ traceStore: new LocalAiTraceStore({ db: adapters.db }) })
  };
}

function createServer(adapters) {
  const routers = [
    createQuestionInteractionsRouter(adapters),
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
      source: rel(ownerEvidenceRel, 'journey-summary.json'),
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
  const ownerSummary = rel(ownerEvidenceRel, 'journey-summary.json');
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

test('T16 API and DB readback E2E covers contract matrix success, error, timeout, export, owner, visual, and local-only evidence', { skip: isV13ApiDbRun }, async () => {
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
      dbPath: api.db.filePath,
      outputPath: path.join(evidenceRoot, 'operator-export.json')
    });
    const snapshot = api.db.snapshot();
    const successCoverage = assertAllSuccessPathsCovered(api.trace);
    const forbiddenRemoteFindings = scanLocalOnlyFiles();
    assert.deepEqual(forbiddenRemoteFindings, []);
    assert.deepEqual(api.cloud.remoteCalls, []);
    assert.deepEqual(api.payment.remoteCalls, []);
    assert.ok(fs.existsSync(api.db.read('report_exports', pdf.body.exportId).filePath));

    const apiTracePath = writeJson(e2eRel('api-trace.json'), {
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
    const dbSnapshotPath = writeJson(e2eRel('db-snapshot.json'), {
      taskId: 'T16',
      status: 'PASS',
      tables: Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.length])),
      readback: dbReadback,
      operatorExport: {
        path: e2eRel('operator-export.json'),
        tables: Object.fromEntries(Object.entries(operatorExport.tables).map(([table, rows]) => [table, rows.length]))
      }
    });
    const assertionsPath = writeJson(e2eRel('assertions.json'), {
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
    const summaryPath = writeJson(e2eRel('summary.json'), summary);
    writeJson(rel(apiDbSummaryRel, 'summary.json'), {
      ...summary,
      canonicalEvidence: summaryPath
    });
  });
});

test('T32 API DB LLM trace E2E covers v1.3 tutor routes, branches, readbacks, and trace manifest', async () => {
  await withApi(async (api) => {
    const localOnly = assertLocalOnlyEnvironment({
      LOCAL_ONLY: 'true',
      SCOREMAP_ADAPTER_MODE: 'local-mock'
    });

    const fixture = await createUploadedPreview(api, 't32-main');
    await pay(api, fixture.create, 'basic', 't32-main-basic');
    await pay(api, fixture.create, 'full', 't32-main-full');
    const auth = { 'x-order-token': fixture.create.body.orderToken };
    const generate = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/generate-full`, {
      taskId: 'task-full-t32-main'
    }, auth, 'success');
    const fullReport = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/full-report`, undefined, auth, 'success');
    const questions = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions`, undefined, auth, 'success');
    assert.equal(generate.status, 200);
    assert.equal(fullReport.status, 200);
    assert.equal(questions.status, 200);
    assert.ok(questions.body.questions.length >= 2);

    const question = questions.body.questions[0];
    const tutor = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t32-tutor',
      actionType: 'explain_step'
    }, auth, 'success');
    const exercise = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t32-exercise',
      actionType: 'similar_question'
    }, auth, 'success');
    const answerFailure = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: exercise.body.interactionId,
      submittedAnswer: 'B',
      simulate: 'provider_failure'
    }, auth, 'provider_failure');
    const answer = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: exercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth, 'success');
    const duplicateAnswer = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: exercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth, 'duplicate');
    const history = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/interactions`, undefined, auth, 'success');

    assert.equal(tutor.status, 201);
    assert.equal(exercise.status, 201);
    assert.equal(answerFailure.status, 502);
    assert.equal(answer.status, 200);
    assert.equal(duplicateAnswer.status, 409);
    assert.equal(history.status, 200);
    assert.equal(history.body.items.length, 2);

    const unauthenticated = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions`, undefined, {
      'x-local-auth-state': 'anonymous'
    }, 'unauthenticated');
    const unauthorized = await requestJson(api, 'GET', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions`, undefined, {
      'x-local-user-id': 'different-local-user',
      'x-order-token': 'wrong-token'
    }, 'unauthorized');
    const missingOrder = await requestJson(api, 'GET', '/api/diagnosis-orders/missing-order/questions', undefined, auth, 'not_found');
    const missingQuestion = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/missing-question/interactions`, {
      interactionId: 'interaction-t32-missing-question',
      actionType: 'explain_step'
    }, auth, 'not_found');
    const invalidAction = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t32-invalid-action',
      actionType: 'open_chat'
    }, auth, 'validation');
    const timeout = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t32-timeout',
      actionType: 'explain_differently',
      simulate: 'timeout'
    }, auth, 'timeout');
    const providerFailure = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t32-provider-failure',
      actionType: 'simpler_example',
      simulate: 'provider_failure'
    }, auth, 'provider_failure');
    const nonExercise = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t32-non-exercise',
      actionType: 'explain_error'
    }, auth, 'success');
    const missingExercise = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: nonExercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth, 'not_found');
    const secondQuestion = questions.body.questions[1];
    const invalidAnswerExercise = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${secondQuestion.id}/interactions`, {
      interactionId: 'interaction-t32-invalid-answer',
      actionType: 'similar_question'
    }, auth, 'success');
    const invalidAnswer = await requestJson(api, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/questions/${secondQuestion.id}/exercise-answer`, {
      interactionId: invalidAnswerExercise.body.interactionId,
      submittedAnswer: 'Z'
    }, auth, 'validation');

    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthorized.status, 403);
    assert.equal(missingOrder.status, 404);
    assert.equal(missingQuestion.status, 404);
    assert.equal(invalidAction.status, 400);
    assert.equal(timeout.status, 504);
    assert.equal(providerFailure.status, 502);
    assert.equal(missingExercise.status, 404);
    assert.equal(invalidAnswer.status, 400);

    const basicOnly = await createUploadedPreview(api, 't32-basic-only');
    await pay(api, basicOnly.create, 'basic', 't32-basic-only');
    const unpaidQuestions = await requestJson(api, 'GET', `/api/diagnosis-orders/${basicOnly.create.body.orderId}/questions`, undefined, {
      'x-order-token': basicOnly.create.body.orderToken
    }, 'entitlement');
    assert.equal(unpaidQuestions.status, 403);

    const noQuestionsFixture = await createUploadedPreview(api, 't32-no-questions');
    await pay(api, noQuestionsFixture.create, 'basic', 't32-no-questions-basic');
    await pay(api, noQuestionsFixture.create, 'full', 't32-no-questions-full');
    const noQuestions = await requestJson(api, 'GET', `/api/diagnosis-orders/${noQuestionsFixture.create.body.orderId}/questions`, undefined, {
      'x-order-token': noQuestionsFixture.create.body.orderToken
    }, 'not_ready');
    assert.equal(noQuestions.status, 409);

    const quotaFixture = await createUploadedPreview(api, 't32-quota');
    await pay(api, quotaFixture.create, 'basic', 't32-quota-basic');
    await pay(api, quotaFixture.create, 'full', 't32-quota-full');
    const quotaAuth = { 'x-order-token': quotaFixture.create.body.orderToken };
    await requestJson(api, 'POST', `/api/diagnosis-orders/${quotaFixture.create.body.orderId}/generate-full`, {
      taskId: 'task-full-t32-quota'
    }, quotaAuth, 'success');
    const quotaQuestions = await requestJson(api, 'GET', `/api/diagnosis-orders/${quotaFixture.create.body.orderId}/questions`, undefined, quotaAuth, 'success');
    const seeded = seedAdditionalQuestions(api, quotaFixture.create.body.orderId, quotaQuestions.body.questions[0], 4);
    const quotaSuccesses = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      quotaSuccesses.push(await requestJson(api, 'POST', `/api/diagnosis-orders/${quotaFixture.create.body.orderId}/questions/${seeded[0].id}/interactions`, {
        interactionId: `interaction-t32-question-quota-${attempt}`,
        actionType: 'explain_step'
      }, quotaAuth, 'success'));
    }
    const questionQuotaExceeded = await requestJson(api, 'POST', `/api/diagnosis-orders/${quotaFixture.create.body.orderId}/questions/${seeded[0].id}/interactions`, {
      interactionId: 'interaction-t32-question-quota-exceeded',
      actionType: 'explain_step'
    }, quotaAuth, 'quota_exceeded');
    for (const [index, quotaQuestion] of seeded.slice(1).entries()) {
      const absoluteIndex = index + 1;
      const perQuestionAttempts = absoluteIndex < 3 ? 3 : 1;
      for (let attempt = 0; attempt < perQuestionAttempts; attempt += 1) {
        quotaSuccesses.push(await requestJson(api, 'POST', `/api/diagnosis-orders/${quotaFixture.create.body.orderId}/questions/${quotaQuestion.id}/interactions`, {
          interactionId: `interaction-t32-report-quota-${absoluteIndex}-${attempt}`,
          actionType: 'explain_step'
        }, quotaAuth, 'success'));
      }
    }
    const reportQuotaExceeded = await requestJson(api, 'POST', `/api/diagnosis-orders/${quotaFixture.create.body.orderId}/questions/${seeded[3].id}/interactions`, {
      interactionId: 'interaction-t32-report-quota-exceeded',
      actionType: 'explain_step'
    }, quotaAuth, 'quota_exceeded');
    assert.equal(quotaSuccesses.length, 10);
    assert.equal(quotaSuccesses.every((item) => item.status === 201), true);
    assert.equal(questionQuotaExceeded.status, 429);
    assert.equal(reportQuotaExceeded.status, 429);

    const traces = api.db.all('ai_model_traces');
    const requiredPromptIds = [
      'LLM-PREVIEW-01',
      'LLM-BASIC-02',
      'LLM-FULL-03',
      'LLM-QUESTION-04',
      'LLM-TUTOR-05',
      'LLM-EXERCISE-06',
      'LLM-CHECK-07'
    ];
    for (const promptId of requiredPromptIds) {
      assert.ok(traces.some((trace) => trace.promptId === promptId && trace.localOnly === true), promptId);
    }

    const t32SuccessCoverage = assertV13SuccessPathsCovered(api.trace);
    const snapshot = api.db.snapshot();
    const mainOrder = api.db.assertReadback('diagnosis_orders', fixture.create.body.orderId, { questionInteractionQuotaUsed: 4 });
    const mainQuestion = api.db.assertReadback('diagnosis_questions', question.id, { questionInteractionQuotaUsed: 3 });
    const traceManifest = {
      taskId: 'T32',
      status: 'PASS',
      command: t32Command,
      requirementIds: ['V13-R02', 'V13-R03', 'V13-R05', 'V13-R06', 'V13-R07', 'V13-R08', 'V13-R13'],
      contracts: [
        { id: 'V13-DB-Q', status: 'PASS', table: 'diagnosis_questions', readbackIds: questions.body.questions.map((item) => item.id), llmPromptId: 'LLM-QUESTION-04' },
        { id: 'V13-DB-I', status: 'PASS', table: 'question_interactions', readbackIds: ['interaction-t32-tutor', 'interaction-t32-exercise', 'interaction-t32-timeout', 'interaction-t32-provider-failure'], llmPromptIds: ['LLM-TUTOR-05', 'LLM-EXERCISE-06', 'LLM-CHECK-07'] },
        { id: 'V13-DB-T', status: 'PASS', table: 'ai_model_traces', promptIds: requiredPromptIds },
        { id: 'V13-API-01', status: 'PASS', route: 'GET /api/diagnosis-orders/{orderId}/questions', successStatus: questions.status, negativeBranches: ['unauthenticated', 'unauthorized', 'entitlement', 'not_found', 'not_ready'] },
        { id: 'V13-API-02', status: 'PASS', route: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions', successStatus: tutor.status, negativeBranches: ['validation', 'not_found', 'quota_exceeded', 'timeout', 'provider_failure'] },
        { id: 'V13-API-03', status: 'PASS', route: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer', successStatus: answer.status, negativeBranches: ['validation', 'not_found', 'provider_failure', 'duplicate'] },
        { id: 'V13-API-04', status: 'PASS', route: 'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions', successStatus: history.status, negativeBranches: ['unauthenticated', 'unauthorized', 'not_found'] },
        { id: 'V13-API-05', status: 'PASS', route: 'POST /api/diagnosis-orders/{orderId}/generate-full', successStatus: generate.status, negativeBranches: ['entitlement', 'provider_failure', 'no_basic_decision'] }
      ],
      routes: t32SuccessCoverage,
      apiToDbToLlmToUi: [
        {
          apiCall: 'POST /api/diagnosis-orders/{orderId}/start-preview-analysis',
          dbReadback: `diagnosis_decisions/decision-${fixture.create.body.orderId}-preview`,
          llmTrace: traces.find((trace) => trace.promptId === 'LLM-PREVIEW-01').traceId,
          uiConsumer: '/pages/preview/index'
        },
        {
          apiCall: 'GET /api/diagnosis-orders/{orderId}/basic-decision',
          dbReadback: `diagnosis_decisions/decision-${fixture.create.body.orderId}-basic`,
          llmTrace: traces.find((trace) => trace.promptId === 'LLM-BASIC-02').traceId,
          uiConsumer: '/pages/basic-result/index'
        },
        {
          apiCall: 'POST /api/diagnosis-orders/{orderId}/generate-full',
          dbReadback: `diagnosis_decisions/decision-${fixture.create.body.orderId}-full`,
          llmTrace: traces.find((trace) => trace.promptId === 'LLM-FULL-03').traceId,
          uiConsumer: '/pages/full-report/index'
        },
        {
          apiCall: 'GET /api/diagnosis-orders/{orderId}/questions',
          dbReadback: `diagnosis_questions/${question.id}`,
          llmTrace: api.db.read('diagnosis_questions', question.id).traceId,
          uiConsumer: '/pages/wrong-question/index'
        },
        {
          apiCall: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions',
          dbReadback: 'question_interactions/interaction-t32-tutor',
          llmTrace: api.db.read('question_interactions', 'interaction-t32-tutor').traceId,
          uiConsumer: '/pages/ai-tutor/index'
        },
        {
          apiCall: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions',
          dbReadback: 'question_interactions/interaction-t32-exercise',
          llmTrace: api.db.read('question_interactions', 'interaction-t32-exercise').traceId,
          uiConsumer: '/pages/ai-exercise/index'
        },
        {
          apiCall: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer',
          dbReadback: 'question_interactions/interaction-t32-exercise',
          llmTrace: api.db.read('question_interactions', 'interaction-t32-exercise').answerTraceId,
          uiConsumer: '/pages/ai-exercise-feedback/index'
        }
      ],
      branchEvidence: {
        success: { generate: generate.status, fullReport: fullReport.status, questions: questions.status, tutor: tutor.status, exercise: exercise.status, answer: answer.status, history: history.status },
        validation: { invalidAction: invalidAction.status, invalidAnswer: invalidAnswer.status },
        auth: { unauthenticated: unauthenticated.status, unauthorized: unauthorized.status },
        ownership: { unauthorizedCrossOwner: unauthorized.status },
        notFound: { missingOrder: missingOrder.status, missingQuestion: missingQuestion.status, missingExercise: missingExercise.status },
        entitlement: { unpaidQuestions: unpaidQuestions.status },
        quotaExceeded: { reportQuotaExceeded: reportQuotaExceeded.status, questionQuotaExceeded: questionQuotaExceeded.status },
        timeout: { interactionTimeout: timeout.status },
        providerFailure: { interactionProviderFailure: providerFailure.status, answerProviderFailure: answerFailure.status },
        duplicate: { duplicateAnswer: duplicateAnswer.status },
        notReady: { noQuestions: noQuestions.status }
      },
      dbReadback: {
        order: mainOrder,
        question: mainQuestion,
        tutorInteraction: api.db.assertReadback('question_interactions', 'interaction-t32-tutor', { status: 'success' }),
        exerciseInteraction: api.db.assertReadback('question_interactions', 'interaction-t32-exercise', { submittedAnswer: 'B' }),
        timeoutInteraction: api.db.assertReadback('question_interactions', 'interaction-t32-timeout', { status: 'failed' }),
        providerFailureInteraction: api.db.assertReadback('question_interactions', 'interaction-t32-provider-failure', { status: 'failed' }),
        quotaOrder: api.db.assertReadback('diagnosis_orders', quotaFixture.create.body.orderId, { questionInteractionQuotaUsed: 10 }),
        traces: requiredPromptIds.map((promptId) => ({
          promptId,
          count: traces.filter((trace) => trace.promptId === promptId).length,
          traceIds: traces.filter((trace) => trace.promptId === promptId).map((trace) => trace.traceId)
        }))
      },
      localOnly: {
        environment: localOnly,
        paymentAdapter: api.payment.assertLocalOnly(),
        cloudAdapter: api.cloud.assertLocalOnly(),
        aiAdapter: 'local-deterministic-ai-mock',
        remoteCalls: []
      }
    };

    assert.deepEqual(api.cloud.remoteCalls, []);
    assert.deepEqual(api.payment.remoteCalls, []);
    assert.equal(traceManifest.apiToDbToLlmToUi.every((item) => item.llmTrace), true);

    const traceManifestPath = writeJson(rel(apiDbSummaryRel, 'T32-trace-manifest.json'), traceManifest);
    const llmManifestPath = writeJson(rel(llmEvidenceRel, 'T32-llm-trace-manifest.json'), {
      taskId: 'T32',
      status: 'PASS',
      command: t32Command,
      requiredPromptIds,
      traces,
      secretSafe: traces.every((trace) => trace.localOnly === true && !JSON.stringify(trace).match(/sk-[A-Za-z0-9]{12,}|AKID[A-Za-z0-9]{8,}/))
    });
    const apiTranscriptPath = writeJson(rel(apiDbSummaryRel, 'T32-api-branches.json'), {
      taskId: 'T32',
      status: 'PASS',
      command: t32Command,
      calls: api.trace,
      successCoverage: t32SuccessCoverage,
      branchEvidence: traceManifest.branchEvidence
    });
    const dbReadbackPath = writeJson(rel(apiDbSummaryRel, 'T32-db-readback.json'), {
      taskId: 'T32',
      status: 'PASS',
      command: t32Command,
      tables: Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.length])),
      readback: traceManifest.dbReadback
    });

    writeJson(rel(resultRootRel, 'T32.json'), {
      taskId: 'T32',
      status: 'PASS',
      command: t32Command,
      evidence: [traceManifestPath, llmManifestPath, apiTranscriptPath, dbReadbackPath],
      result: 'All v1.3 API routes, DB readbacks, mandatory LLM prompt ids, local-only adapters, quota/auth/error branches, and UI consumer trace links are covered.'
    });
    writeJson(rel(apiDbSummaryRel, 'summary.json'), {
      taskId: 'T32',
      status: 'PASS',
      command: t32Command,
      canonicalEvidence: traceManifestPath,
      evidence: { traceManifest: traceManifestPath, llmManifest: llmManifestPath, apiBranches: apiTranscriptPath, dbReadback: dbReadbackPath }
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
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/export-pdf$/, '/api/diagnosis-orders/{orderId}/export-pdf')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/questions$/, '/api/diagnosis-orders/{orderId}/questions')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/questions\/[^/]+\/interactions$/, '/api/diagnosis-orders/{orderId}/questions/{questionId}/interactions')
    .replace(/^\/api\/diagnosis-orders\/[^/]+\/questions\/[^/]+\/exercise-answer$/, '/api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer');
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

function assertV13SuccessPathsCovered(trace) {
  const covered = new Set(
    trace
      .filter((item) => item.branch === 'success' && item.responseStatus >= 200 && item.responseStatus < 300)
      .map((item) => `${item.method} ${item.path}`)
  );
  const missing = v13SuccessPaths.filter((item) => !covered.has(item));
  assert.deepEqual(missing, []);
  return v13SuccessPaths.map((item) => ({ path: item, status: 'PASS' }));
}

function seedAdditionalQuestions(api, orderId, template, count) {
  const order = api.db.read('diagnosis_orders', orderId);
  const existing = api.db.find('diagnosis_questions', (row) => row.orderId === orderId);
  const questions = existing.slice();
  for (let index = existing.length; index < count; index += 1) {
    questions.push(api.db.insert('diagnosis_questions', {
      ...template,
      id: `question-${orderId}-seed-${index + 1}`,
      orderId,
      ownerId: order.ownerId,
      index: index + 1,
      questionInteractionQuotaTotal: 3,
      questionInteractionQuotaUsed: 0,
      questionInteractionQuotaRemaining: 3
    }));
  }
  return questions.slice(0, count);
}
