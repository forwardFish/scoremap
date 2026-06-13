const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { getPrimaryEvidencePath, writeJsonEvidence } = require('../../shared/evidence-paths');
const { createLocalAdapters } = require('../src/adapters');
const { createDiagnosisOrdersRouter } = require('../src/routes/diagnosis-orders');
const { createPaymentsRouter } = require('../src/routes/payments');
const { createReportsRouter } = require('../src/routes/reports');
const { exportLocalData } = require('../scripts/export-local-data');

const projectRoot = path.resolve(__dirname, '..', '..');
const command = 'npm --prefix server test -- report feedback export';
const t22Command = 'npm --prefix server test -- full-report wrong-questions';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('backend-api-report', name), payload);
}

function writeT22Evidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('api-db-llm', name), payload);
}

function writeResult(relativePath, payload) {
  const outputPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function makeAdapters() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-t05-'));
  const dbPath = path.join(tempRoot, 'scoremap-local-db.json');
  return {
    ...createLocalAdapters({
      dbPath,
      cloudRootDir: path.join(tempRoot, 'local-cloud')
    }),
    dbPath,
    exportRootDir: getPrimaryEvidencePath(projectRoot, path.join('backend-api-report', 'local-report-exports')),
    dataExportPath: getPrimaryEvidencePath(projectRoot, path.join('backend-api-report', 'operator-export.json'))
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
    source: `T05-${suffix}`,
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  assert.equal(create.status, 201);
  const upload = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/uploads`, {
    authorizationAccepted: true,
    files: [{ id: `upload-t05-${suffix}`, originalName: 'answer-sheet.png', content: 'local mock upload bytes' }]
  }, { 'x-order-token': create.body.orderToken });
  assert.equal(upload.status, 200);
  const start = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/start-preview-analysis`, {}, {
    'x-order-token': create.body.orderToken
  });
  assert.equal(start.status, 200);
  return { create, upload, start };
}

async function pay(api, order, paymentType, transactionSuffix) {
  const payment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
    orderId: order.body.orderId,
    paymentType
  }, { 'x-order-token': order.body.orderToken });
  assert.ok(payment.status === 201 || payment.status === 200);
  const callback = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/callback', {
    paymentId: payment.body.paymentId,
    status: 'paid',
    mockTransactionId: `mock-tx-t05-${transactionSuffix}`,
    mockSignature: 'local-mock-signature'
  });
  assert.equal(callback.status, 200);
  return { payment, callback };
}

async function createFullPaidOrder(api, suffix) {
  const fixture = await createPreviewReadyOrder(api, suffix);
  const basicPayment = await pay(api, fixture.create, 'basic', `${suffix}-basic`);
  const fullPayment = await pay(api, fixture.create, 'full', `${suffix}-full`);
  return { ...fixture, basicPayment, fullPayment };
}

test('T05 reads basic decision, generates full report, saves it, and lists my reports', async () => {
  await withApi(async (api) => {
    const { create } = await createFullPaidOrder(api, 'report');
    const basic = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/basic-decision`, undefined, {
      'x-order-token': create.body.orderToken
    });
    const generate = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/generate-full`, {}, {
      'x-order-token': create.body.orderToken
    });
    const full = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/full-report`, undefined, {
      'x-order-token': create.body.orderToken
    });
    const save = await requestJson(api.baseUrl, 'POST', `/api/reports/${create.body.orderId}/save`, {}, {
      'x-order-token': create.body.orderToken
    });
    const reports = await requestJson(api.baseUrl, 'GET', '/api/my/reports', undefined);

    assert.equal(basic.status, 200);
    assert.equal(basic.body.decision.lossPoints.length, 2);
    assert.equal(generate.status, 200);
    assert.equal(generate.body.status, 'full_done');
    assert.equal(full.status, 200);
    assert.equal(full.body.decision.modules.length, 4);
    assert.equal(save.status, 200);
    assert.equal(reports.status, 200);
    assert.equal(reports.body.items.length, 1);
    assert.deepEqual(reports.body.items[0].decisionLevels.sort(), ['basic', 'full', 'preview']);

    const snapshot = api.db.snapshot();
    const basicDecision = snapshot.diagnosis_decisions.find((row) => row.orderId === create.body.orderId && row.level === 'basic');
    const fullDecision = snapshot.diagnosis_decisions.find((row) => row.orderId === create.body.orderId && row.level === 'full');
    const fullTask = snapshot.ai_analysis_tasks.find((row) => row.orderId === create.body.orderId && row.type === 'full');

    writeEvidence('full-report-success.json', {
      status: 'PASS',
      command,
      requirementIds: ['R09', 'R10'],
      pageJumpEvidence: {
        status: 'PASS_WITH_LIMITATION',
        route: '/pages/full-unlock/index -> /pages/full-report-entry/index -> /pages/full-report/index -> /pages/reports/index',
        clickPath: 'O04/O05 API-backed path: generate full -> view full report -> save report -> list my reports',
        reason: 'T05 owns backend report APIs; frontend route rendering and exact clicks are assigned to T11/T12/T15.'
      },
      apiCalls: [
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/basic-decision', responseStatus: basic.status, response: basic.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/generate-full', responseStatus: generate.status, response: generate.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/full-report', responseStatus: full.status, response: full.body },
        { method: 'POST', path: '/api/reports/{reportId}/save', responseStatus: save.status, response: save.body },
        { method: 'GET', path: '/api/my/reports', responseStatus: reports.status, response: reports.body }
      ],
      dbReadback: {
        order: api.db.assertReadback('diagnosis_orders', create.body.orderId, {
          status: 'full_done',
          accessLevel: 'full',
          savedReport: true
        }),
        basicDecision,
        fullTask: api.db.assertReadback('ai_analysis_tasks', fullTask.id, { status: 'full_done' }),
        fullDecision
      }
    });
  });
});

test('T22 generate-full creates wrong-question cards, quota, and full/question traces for API consumers', async () => {
  await withApi(async (api) => {
    const { create } = await createFullPaidOrder(api, 't22-cards');
    const basic = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/basic-decision`, undefined, {
      'x-order-token': create.body.orderToken
    });
    const generate = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/generate-full`, {
      taskId: 'task-full-t22-cards'
    }, { 'x-order-token': create.body.orderToken });
    const full = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/full-report`, undefined, {
      'x-order-token': create.body.orderToken
    });

    assert.equal(basic.status, 200);
    assert.equal(generate.status, 200);
    assert.equal(full.status, 200);
    assert.ok(generate.body.wrongQuestionCards.length >= 2);
    assert.ok(full.body.wrongQuestionCards.length >= 2);
    assert.equal(generate.body.quota.report.total, 10);
    assert.equal(full.body.quota.report.remaining, 10);
    assert.equal(full.body.quota.questions.length, generate.body.wrongQuestionCards.length);

    const snapshot = api.db.snapshot();
    const questions = snapshot.diagnosis_questions.filter((row) => row.orderId === create.body.orderId);
    const traces = snapshot.ai_model_traces;
    assert.ok(questions.length >= 2);
    assert.ok(traces.some((trace) => trace.promptId === 'LLM-FULL-03' && trace.status === 'SUCCESS'));
    assert.ok(traces.some((trace) => trace.promptId === 'LLM-QUESTION-04' && trace.status === 'SUCCESS'));
    for (const question of questions) {
      assert.equal(question.questionInteractionQuotaTotal, 3);
      assert.equal(question.questionInteractionQuotaRemaining, 3);
    }

    const evidence = {
      status: 'PASS',
      command: t22Command,
      requirementIds: ['V13-R01', 'V13-R08', 'V13-R09'],
      apiCalls: [
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/generate-full', responseStatus: generate.status, response: generate.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/full-report', responseStatus: full.status, response: full.body }
      ],
      dbReadback: {
        order: api.db.assertReadback('diagnosis_orders', create.body.orderId, { questionInteractionQuotaTotal: 10 }),
        questions,
        traces
      },
      assertions: [
        'Full report generation created at least two wrong-question cards.',
        'POST and GET responses expose wrong-question summaries and quota for UI/API consumers.',
        'LLM-FULL-03 and LLM-QUESTION-04 traces are persisted in local ai_model_traces.'
      ]
    };
    writeT22Evidence('T22-full-report-question-cards.json', evidence);
  });
});

test('T22 covers entitlement, missing basic context, provider failure, and no-question fallback branches', async () => {
  await withApi(async (api) => {
    const basicOnly = await createPreviewReadyOrder(api, 't22-basic-only');
    await pay(api, basicOnly.create, 'basic', 't22-basic-only');
    const entitlement = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${basicOnly.create.body.orderId}/generate-full`, {}, {
      'x-order-token': basicOnly.create.body.orderToken
    });

    const missingContext = await requestJson(api.baseUrl, 'POST', '/api/diagnosis-orders', {
      source: 'T22-missing-basic-context',
      grade: 'grade-5',
      subject: 'math',
      examType: 'unit-test',
      materialType: 'answer-sheet'
    });
    api.db.update('diagnosis_orders', missingContext.body.orderId, { accessLevel: 'full' });
    const missingBasic = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${missingContext.body.orderId}/generate-full`, {}, {
      'x-order-token': missingContext.body.orderToken
    });

    const providerOrder = await createFullPaidOrder(api, 't22-provider');
    const providerFailure = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${providerOrder.create.body.orderId}/generate-full`, {
      simulateQuestionExtraction: 'provider_failure'
    }, { 'x-order-token': providerOrder.create.body.orderToken });

    const fallbackOrder = await createFullPaidOrder(api, 't22-fallback');
    const fallback = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${fallbackOrder.create.body.orderId}/generate-full`, {
      forceNoQuestionFallback: true
    }, { 'x-order-token': fallbackOrder.create.body.orderToken });
    const fallbackQuestions = api.db.find('diagnosis_questions', (row) => row.orderId === fallbackOrder.create.body.orderId);

    assert.equal(entitlement.status, 403);
    assert.equal(entitlement.body.code, 'FULL_ENTITLEMENT_REQUIRED');
    assert.equal(missingBasic.status, 404);
    assert.equal(providerFailure.status, 502);
    assert.equal(providerFailure.body.code, 'LOCAL_AI_PROVIDER_FAILURE');
    assert.equal(fallback.status, 200);
    assert.ok(fallback.body.wrongQuestionCards.length >= 2);
    assert.equal(fallbackQuestions.every((row) => row.source === 'fallback'), true);

    const evidence = {
      status: 'PASS',
      command: t22Command,
      branches: {
        missingFullEntitlement: { responseStatus: entitlement.status, response: entitlement.body },
        missingBasicDecisionContext: { responseStatus: missingBasic.status, response: missingBasic.body },
        providerFailure: { responseStatus: providerFailure.status, response: providerFailure.body },
        noQuestionFallback: { responseStatus: fallback.status, response: fallback.body }
      },
      dbReadback: {
        fallbackOrder: api.db.assertReadback('diagnosis_orders', fallbackOrder.create.body.orderId, { questionInteractionQuotaTotal: 10 }),
        fallbackQuestions,
        traces: api.db.all('ai_model_traces')
      },
      assertions: [
        'Unpaid/basic users cannot generate full-report tutor data.',
        'Missing basic report context fails before creating a full report.',
        'Provider failure is reported with a local trace id and does not fake success.',
        'No-question extraction creates explicit fallback cards with source=fallback.'
      ]
    };
    writeT22Evidence('T22-negative-branches.json', evidence);
    writeResult('docs/auto-execute/results/T22.json', {
      taskId: 'T22',
      status: 'PASS',
      command: t22Command,
      evidence: [
        'docs/auto-execute/evidence/api-db-llm/T22-full-report-question-cards.json',
        'docs/auto-execute/evidence/api-db-llm/T22-negative-branches.json'
      ],
      result: 'Full-report generation creates wrong-question cards, quota, and LLM traces, and covers required negative branches.'
    });
  });
});

test('T05 inserts feedback, exports local PDF record, reads export, and produces operator data export', async () => {
  await withApi(async (api) => {
    const { create } = await createFullPaidOrder(api, 'feedback-export');
    const generate = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/generate-full`, {}, {
      'x-order-token': create.body.orderToken
    });
    assert.equal(generate.status, 200);
    const feedback = await requestJson(api.baseUrl, 'POST', '/api/feedbacks', {
      orderId: create.body.orderId,
      decisionLevel: 'full',
      rating: 5,
      tags: ['clear', 'useful'],
      text: 'Local test feedback only.'
    }, { 'x-order-token': create.body.orderToken });
    const pdf = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/export-pdf`, {
      exportId: 'report-export-t05'
    }, { 'x-order-token': create.body.orderToken });
    const exportRead = await requestJson(api.baseUrl, 'GET', `/api/report-exports/${pdf.body.exportId}`, undefined);
    const operatorExport = exportLocalData({
      dbPath: api.dbPath,
      outputPath: api.dataExportPath
    });

    assert.equal(feedback.status, 201);
    assert.equal(pdf.status, 201);
    assert.match(pdf.body.fileUrl, /^local-report-export:\/\//);
    assert.equal(exportRead.status, 200);
    assert.ok(fs.existsSync(api.db.read('report_exports', pdf.body.exportId).filePath));
    assert.equal(operatorExport.tables.feedbacks.length, 1);
    assert.equal(operatorExport.tables.report_exports.length, 1);

    writeEvidence('feedback-export-success.json', {
      status: 'PASS',
      command,
      requirementIds: ['R09', 'R10', 'R12'],
      apiCalls: [
        { method: 'POST', path: '/api/feedbacks', responseStatus: feedback.status, response: feedback.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/export-pdf', responseStatus: pdf.status, response: pdf.body },
        { method: 'GET', path: '/api/report-exports/{exportId}', responseStatus: exportRead.status, response: exportRead.body }
      ],
      dbReadback: {
        feedback: api.db.assertReadback('feedbacks', feedback.body.feedbackId, { orderId: create.body.orderId }),
        reportExport: api.db.assertReadback('report_exports', pdf.body.exportId, { status: 'ready' }),
        operatorExportPath: api.dataExportPath,
        exportedTables: Object.fromEntries(Object.entries(operatorExport.tables).map(([name, rows]) => [name, rows.length]))
      },
      localOnly: {
        reportFileScheme: pdf.body.fileUrl.split('://')[0],
        reportFileExists: fs.existsSync(api.db.read('report_exports', pdf.body.exportId).filePath)
      }
    });
  });
});

test('T05 covers report entitlement, validation, owner denial, and not-found branches', async () => {
  await withApi(async (api) => {
    const previewOnly = await createPreviewReadyOrder(api, 'preview-only');
    const basicDenied = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${previewOnly.create.body.orderId}/basic-decision`, undefined, {
      'x-order-token': previewOnly.create.body.orderToken
    });
    assert.equal(basicDenied.status, 403);

    const { create } = await createFullPaidOrder(api, 'errors');
    const forbidden = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/full-report`, undefined, {
      'x-local-user-id': 'different-local-user',
      'x-order-token': 'wrong-token'
    });
    const missingFull = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/full-report`, undefined, {
      'x-order-token': create.body.orderToken
    });
    const invalidFeedback = await requestJson(api.baseUrl, 'POST', '/api/feedbacks', {
      orderId: create.body.orderId,
      decisionLevel: 'preview',
      rating: 9
    }, { 'x-order-token': create.body.orderToken });
    const missingExport = await requestJson(api.baseUrl, 'GET', '/api/report-exports/missing-export', undefined);

    assert.equal(forbidden.status, 403);
    assert.equal(missingFull.status, 409);
    assert.equal(invalidFeedback.status, 400);
    assert.equal(missingExport.status, 404);

    writeEvidence('failure-branches.json', {
      status: 'PASS',
      command,
      apiCalls: [
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/basic-decision', branch: 'preview_only_denied', responseStatus: basicDenied.status, response: basicDenied.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/full-report', branch: 'owner_denial', responseStatus: forbidden.status, response: forbidden.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/full-report', branch: 'not_generated', responseStatus: missingFull.status, response: missingFull.body },
        { method: 'POST', path: '/api/feedbacks', branch: 'validation', responseStatus: invalidFeedback.status, response: invalidFeedback.body },
        { method: 'GET', path: '/api/report-exports/{exportId}', branch: 'not_found', responseStatus: missingExport.status, response: missingExport.body }
      ],
      dbReadback: {
        previewOnlyOrder: api.db.assertReadback('diagnosis_orders', previewOnly.create.body.orderId, { accessLevel: 'preview' }),
        protectedOrder: api.db.assertReadback('diagnosis_orders', create.body.orderId, { accessLevel: 'full' })
      }
    });
  });
});

test('T05 proves local-only boundary and records backend-only visual and owner limitations', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'server/src/services/reports-service.js',
    'server/src/routes/reports.js',
    'server/scripts/export-local-data.js',
    'server/test/reports-api.test.js'
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
      references: ['UI-C09', 'UI-C10', 'UI-C11', 'UI-C12'],
      reason: 'T05 has no frontend rendering surface; reference/actual/diff/metrics remain assigned to T11/T12/T14.'
    },
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      coveredSteps: ['O04 API/DB full report generation', 'O05 API/DB save and revisit', 'O06 API/DB feedback'],
      reason: 'T05 records backend API and DB behavior used by owner journeys, while exact clicks and screenshots are assigned to T15.'
    }
  });
});
