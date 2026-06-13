const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../shared/evidence-paths');
const { createLocalAdapters } = require('../src/adapters');
const { createDiagnosisOrdersRouter } = require('../src/routes/diagnosis-orders');
const { createPaymentsRouter } = require('../src/routes/payments');
const { createQuestionInteractionsRouter } = require('../src/routes/question-interactions');
const { createReportsRouter } = require('../src/routes/reports');

const projectRoot = path.resolve(__dirname, '..', '..');
const command = 'npm --prefix server test -- ai-tutor quota auth failures';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('api-db-llm', name), payload);
}

function writeResult(relativePath, payload) {
  const outputPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function makeAdapters() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-t23-'));
  return createLocalAdapters({
    dbPath: path.join(tempRoot, 'scoremap-local-db.json'),
    cloudRootDir: path.join(tempRoot, 'local-cloud')
  });
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
    source: `T23-${suffix}`,
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  assert.equal(create.status, 201);
  const upload = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/uploads`, {
    authorizationAccepted: true,
    files: [{ id: `upload-t23-${suffix}`, originalName: 'answer-sheet.png', content: 'local mock upload bytes' }]
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
    mockTransactionId: `mock-tx-t23-${transactionSuffix}`,
    mockSignature: 'local-mock-signature'
  });
  assert.equal(callback.status, 200);
  return { payment, callback };
}

async function createFullPaidOrder(api, suffix, { generate = true } = {}) {
  const fixture = await createPreviewReadyOrder(api, suffix);
  await pay(api, fixture.create, 'basic', `${suffix}-basic`);
  await pay(api, fixture.create, 'full', `${suffix}-full`);
  if (generate) {
    const generated = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${fixture.create.body.orderId}/generate-full`, {
      taskId: `task-full-t23-${suffix}`
    }, { 'x-order-token': fixture.create.body.orderToken });
    assert.equal(generated.status, 200);
    return { ...fixture, generated };
  }
  return fixture;
}

test('T23 exposes tutor APIs with quota increments, exercise answer storage, history, and LLM trace readback', async () => {
  await withApi(async (api) => {
    const { create } = await createFullPaidOrder(api, 'success');
    const auth = { 'x-order-token': create.body.orderToken };
    const questions = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/questions`, undefined, auth);
    assert.equal(questions.status, 200);
    assert.ok(questions.body.questions.length >= 2);
    const question = questions.body.questions[0];

    const tutor = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t23-tutor',
      actionType: 'explain_step'
    }, auth);
    const exercise = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t23-exercise',
      actionType: 'similar_question'
    }, auth);
    const answer = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: exercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth);
    const history = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, undefined, auth);

    assert.equal(tutor.status, 201);
    assert.equal(exercise.status, 201);
    assert.equal(answer.status, 200);
    assert.equal(history.status, 200);
    assert.equal(history.body.items.length, 2);
    assert.equal(history.body.quota.report.used, 2);
    assert.equal(history.body.quota.question.used, 2);

    const traces = api.db.all('ai_model_traces');
    for (const promptId of ['LLM-FULL-03', 'LLM-QUESTION-04', 'LLM-TUTOR-05', 'LLM-EXERCISE-06', 'LLM-CHECK-07']) {
      assert.ok(traces.some((trace) => trace.promptId === promptId && trace.localOnly === true), promptId);
    }

    writeEvidence('T23-api-success-db-llm.json', {
      status: 'PASS',
      command,
      requirementIds: ['V13-R03', 'V13-R04', 'V13-R05', 'V13-R06', 'V13-R07'],
      apiCalls: [
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/questions', responseStatus: questions.status, response: questions.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/questions/{questionId}/interactions', responseStatus: tutor.status, response: tutor.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/questions/{questionId}/interactions', branch: 'similar_question', responseStatus: exercise.status, response: exercise.body },
        { method: 'POST', path: '/api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer', responseStatus: answer.status, response: answer.body },
        { method: 'GET', path: '/api/diagnosis-orders/{orderId}/questions/{questionId}/interactions', responseStatus: history.status, response: history.body }
      ],
      dbReadback: {
        order: api.db.assertReadback('diagnosis_orders', create.body.orderId, { questionInteractionQuotaUsed: 2 }),
        question: api.db.assertReadback('diagnosis_questions', question.id, { questionInteractionQuotaUsed: 2 }),
        tutorInteraction: api.db.assertReadback('question_interactions', 'interaction-t23-tutor', { status: 'success' }),
        exerciseInteraction: api.db.assertReadback('question_interactions', 'interaction-t23-exercise', { submittedAnswer: 'B' }),
        traces
      }
    });
  });
});

test('T23 covers auth, entitlement, validation, provider failure, timeout, redirect, repeated answer, and quota branches', async () => {
  await withApi(async (api) => {
    const { create } = await createFullPaidOrder(api, 'branches');
    const auth = { 'x-order-token': create.body.orderToken };
    const questions = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/questions`, undefined, auth);
    const question = questions.body.questions[0];

    const unauthenticated = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/questions`, undefined, {
      'x-local-auth-state': 'anonymous'
    });
    const forbidden = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/questions`, undefined, {
      'x-local-user-id': 'different-local-user',
      'x-order-token': 'wrong-token'
    });
    const notFound = await requestJson(api.baseUrl, 'GET', '/api/diagnosis-orders/missing-order/questions', undefined, auth);
    const basicOnly = await createPreviewReadyOrder(api, 'basic-only');
    await pay(api, basicOnly.create, 'basic', 'basic-only');
    const unpaid = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${basicOnly.create.body.orderId}/questions`, undefined, {
      'x-order-token': basicOnly.create.body.orderToken
    });
    const noQuestionsOrder = await createFullPaidOrder(api, 'no-questions', { generate: false });
    const noQuestions = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${noQuestionsOrder.create.body.orderId}/questions`, undefined, {
      'x-order-token': noQuestionsOrder.create.body.orderToken
    });
    const invalidAction = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      actionType: 'open_chat'
    }, auth);
    const timeout = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t23-timeout',
      actionType: 'explain_differently',
      simulate: 'timeout'
    }, auth);
    const providerFailure = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t23-provider-failure',
      actionType: 'simpler_example',
      simulate: 'provider_failure'
    }, auth);
    const redirect = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t23-redirect',
      actionType: 'explain_step',
      outOfScope: true
    }, auth);
    const tutor = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t23-non-exercise',
      actionType: 'explain_step'
    }, auth);
    const missingExercise = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: tutor.body.interactionId,
      submittedAnswer: 'B'
    }, auth);
    const exercise = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, {
      interactionId: 'interaction-t23-answer-branches',
      actionType: 'similar_question'
    }, auth);
    const invalidAnswer = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: exercise.body.interactionId,
      submittedAnswer: 'Z'
    }, auth);
    const validAnswer = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: exercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth);
    const duplicateAnswer = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: exercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth);

    assert.equal(unauthenticated.status, 401);
    assert.equal(forbidden.status, 403);
    assert.equal(notFound.status, 404);
    assert.equal(unpaid.status, 403);
    assert.equal(noQuestions.status, 409);
    assert.equal(invalidAction.status, 400);
    assert.equal(timeout.status, 504);
    assert.equal(providerFailure.status, 502);
    assert.equal(redirect.status, 200);
    assert.equal(redirect.body.code, 'OUT_OF_SCOPE_REDIRECT');
    assert.equal(missingExercise.status, 404);
    assert.equal(invalidAnswer.status, 400);
    assert.equal(validAnswer.status, 200);
    assert.equal(duplicateAnswer.status, 409);

    const orderAfterFailures = api.db.assertReadback('diagnosis_orders', create.body.orderId, { questionInteractionQuotaUsed: 2 });
    const questionAfterFailures = api.db.assertReadback('diagnosis_questions', question.id, { questionInteractionQuotaUsed: 2 });
    assert.equal(orderAfterFailures.questionInteractionQuotaRemaining, 8);
    assert.equal(questionAfterFailures.questionInteractionQuotaRemaining, 1);

    const quotaOrder = await createFullPaidOrder(api, 'quota');
    const quotaAuth = { 'x-order-token': quotaOrder.create.body.orderToken };
    const quotaQuestions = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${quotaOrder.create.body.orderId}/questions`, undefined, quotaAuth);
    const seeded = seedAdditionalQuestions(api, quotaOrder.create.body.orderId, quotaQuestions.body.questions[0], 4);
    const quotaCalls = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      quotaCalls.push(await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${quotaOrder.create.body.orderId}/questions/${seeded[0].id}/interactions`, {
        interactionId: `interaction-t23-quota-0-${attempt}`,
        actionType: 'explain_step'
      }, quotaAuth));
    }
    const questionQuotaExceeded = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${quotaOrder.create.body.orderId}/questions/${seeded[0].id}/interactions`, {
      interactionId: 'interaction-t23-question-quota-exceeded',
      actionType: 'explain_step'
    }, quotaAuth);
    for (const [index, quotaQuestion] of seeded.slice(1).entries()) {
      const absoluteIndex = index + 1;
      const perQuestionAttempts = absoluteIndex < 3 ? 3 : 1;
      for (let attempt = 0; attempt < perQuestionAttempts; attempt += 1) {
        quotaCalls.push(await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${quotaOrder.create.body.orderId}/questions/${quotaQuestion.id}/interactions`, {
          interactionId: `interaction-t23-quota-${absoluteIndex}-${attempt}`,
          actionType: 'explain_step'
        }, quotaAuth));
      }
    }
    const reportQuotaExceeded = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${quotaOrder.create.body.orderId}/questions/${seeded[3].id}/interactions`, {
      interactionId: 'interaction-t23-report-quota-exceeded',
      actionType: 'explain_step'
    }, quotaAuth);

    assert.equal(quotaCalls.length, 10);
    assert.equal(quotaCalls.every((item) => item.status === 201), true);
    assert.equal(reportQuotaExceeded.status, 429);
    assert.equal(questionQuotaExceeded.status, 429);
    assert.equal(api.db.read('question_interactions', 'interaction-t23-report-quota-exceeded'), null);
    assert.equal(api.db.read('question_interactions', 'interaction-t23-question-quota-exceeded'), null);

    const evidence = {
      status: 'PASS',
      command,
      requirementIds: ['V13-R02', 'V13-R03', 'V13-R04', 'V13-R06', 'V13-R07'],
      branches: {
        unauthenticated: { responseStatus: unauthenticated.status, response: unauthenticated.body },
        unauthorizedCrossOwner: { responseStatus: forbidden.status, response: forbidden.body },
        notFound: { responseStatus: notFound.status, response: notFound.body },
        unpaidFullEntitlement: { responseStatus: unpaid.status, response: unpaid.body },
        fullReportQuestionsNotReady: { responseStatus: noQuestions.status, response: noQuestions.body },
        validationInvalidAction: { responseStatus: invalidAction.status, response: invalidAction.body },
        providerTimeout: { responseStatus: timeout.status, response: timeout.body },
        providerFailure: { responseStatus: providerFailure.status, response: providerFailure.body },
        outOfScopeRedirect: { responseStatus: redirect.status, response: redirect.body },
        missingExercise: { responseStatus: missingExercise.status, response: missingExercise.body },
        invalidAnswer: { responseStatus: invalidAnswer.status, response: invalidAnswer.body },
        duplicateAnswer: { responseStatus: duplicateAnswer.status, response: duplicateAnswer.body },
        reportQuotaExceeded: { responseStatus: reportQuotaExceeded.status, response: reportQuotaExceeded.body },
        questionQuotaExceeded: { responseStatus: questionQuotaExceeded.status, response: questionQuotaExceeded.body }
      },
      dbReadback: {
        orderAfterFailures,
        questionAfterFailures,
        timeoutInteraction: api.db.assertReadback('question_interactions', 'interaction-t23-timeout', { status: 'failed' }),
        providerFailureInteraction: api.db.assertReadback('question_interactions', 'interaction-t23-provider-failure', { status: 'failed' }),
        redirectedInteraction: api.db.assertReadback('question_interactions', 'interaction-t23-redirect', { status: 'redirected' }),
        quotaOrder: api.db.assertReadback('diagnosis_orders', quotaOrder.create.body.orderId, { questionInteractionQuotaUsed: 10 }),
        traces: api.db.all('ai_model_traces')
      },
      assertions: [
        'Failed provider, timeout, validation, entitlement, auth, redirect, and quota-exceeded calls did not consume successful quota.',
        'Report quota stops at 10 and per-question quota stops at 3.',
        'Exercise answers validate options, reject duplicate submit, and persist LLM-CHECK-07 feedback through the local adapter.'
      ]
    };
    writeEvidence('T23-negative-branches-quota-auth.json', evidence);
    writeResult('docs/auto-execute/results/T23.json', {
      taskId: 'T23',
      status: 'PASS',
      command,
      evidence: [
        'docs/auto-execute/evidence/api-db-llm/T23-api-success-db-llm.json',
        'docs/auto-execute/evidence/api-db-llm/T23-negative-branches-quota-auth.json'
      ],
      routes: [
        'GET /api/diagnosis-orders/{orderId}/questions',
        'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions',
        'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer',
        'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions'
      ],
      result: 'AI tutor APIs enforce full entitlement, owner access, fixed actions, report/question quota, failure recording, exercise answer storage, history readback, and local LLM traces.'
    });
  });
});

test('V143-05 repair drawer APIs expose route-specific C13 actions, mastery writeback, quota, unpaid guards, and failures', async () => {
  await withApi(async (api) => {
    const { create } = await createFullPaidOrder(api, 'v143-05');
    const auth = { 'x-order-token': create.body.orderToken };
    const questions = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/questions`, undefined, auth);
    assert.equal(questions.status, 200);
    const question = questions.body.questions[0];
    const secondQuestion = questions.body.questions[1];

    const teachChild = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/teach-child`, {
      interactionId: 'interaction-v143-05-teach'
    }, auth);
    const similarExercise = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/similar-exercise`, {
      interactionId: 'interaction-v143-05-exercise'
    }, auth);
    const exerciseAnswer = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/exercise-answer`, {
      interactionId: similarExercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth);
    const masteryExercise = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/similar-exercise`, {
      interactionId: 'interaction-v143-05-mastery-exercise'
    }, auth);
    const checkMastery = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/check-mastery`, {
      interactionId: masteryExercise.body.interactionId,
      submittedAnswer: 'B'
    }, auth);
    const history = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/interactions`, undefined, auth);
    const quotaExceeded = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${question.id}/teach-child`, {
      interactionId: 'interaction-v143-05-quota-exceeded'
    }, auth);

    assert.equal(teachChild.status, 201);
    assert.equal(teachChild.body.interaction.actionType, 'teach_child');
    assert.equal(similarExercise.status, 201);
    assert.equal(similarExercise.body.interaction.actionType, 'similar_exercise');
    assert.ok(similarExercise.body.exercise);
    assert.equal(exerciseAnswer.status, 200);
    assert.equal(exerciseAnswer.body.status, 'answered');
    assert.equal(masteryExercise.status, 201);
    assert.equal(checkMastery.status, 200);
    assert.equal(checkMastery.body.status, 'mastery_checked');
    assert.equal(checkMastery.body.masteryStatus, 'initial_mastery');
    assert.equal(history.status, 200);
    assert.equal(history.body.items.length, 3);
    assert.equal(history.body.quota.question.used, 3);
    assert.equal(quotaExceeded.status, 429);

    const missingQuestion = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/missing-question/teach-child`, {}, auth);
    const invalidAnswer = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${secondQuestion.id}/check-mastery`, {
      interactionId: 'missing-interaction',
      submittedAnswer: 'B'
    }, auth);
    const providerFailure = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${create.body.orderId}/questions/${secondQuestion.id}/teach-child`, {
      interactionId: 'interaction-v143-05-provider-failure',
      simulate: 'provider_failure'
    }, auth);
    const basicOnly = await createPreviewReadyOrder(api, 'v143-05-basic-only');
    await pay(api, basicOnly.create, 'basic', 'v143-05-basic-only');
    const unpaidGuard = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${basicOnly.create.body.orderId}/questions/${question.id}/teach-child`, {}, {
      'x-order-token': basicOnly.create.body.orderToken
    });

    assert.equal(missingQuestion.status, 404);
    assert.equal(invalidAnswer.status, 404);
    assert.equal(providerFailure.status, 502);
    assert.equal(unpaidGuard.status, 403);

    const questionReadback = api.db.assertReadback('diagnosis_questions', question.id, { masteryStatus: 'initial_mastery' });
    const decisionReadback = api.db.assertReadback('diagnosis_decisions', `decision-${create.body.orderId}-full`, { level: 'full' });
    const reportCard = decisionReadback.full.wrongQuestionCards.find((card) => card.id === question.id || card.questionId === question.id);
    assert.equal(reportCard.masteryStatus, 'initial_mastery');
    assert.equal(api.db.read('question_interactions', 'interaction-v143-05-quota-exceeded'), null);

    const evidence = {
      status: 'PASS',
      command,
      requirementIds: ['REQ143-005'],
      apiIds: ['API143-011', 'API143-012', 'API143-013', 'API143-014', 'API143-015'],
      ownerScenarios: ['O143-05', 'O143-06', 'O143-07', 'O143-08', 'O143-11'],
      apiCalls: [
        { apiId: 'API143-011', route: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/teach-child', responseStatus: teachChild.status },
        { apiId: 'API143-012', route: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/similar-exercise', responseStatus: similarExercise.status },
        { apiId: 'API143-013', route: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer', responseStatus: exerciseAnswer.status },
        { apiId: 'API143-014', route: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/check-mastery', responseStatus: checkMastery.status },
        { apiId: 'API143-015', route: 'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions', responseStatus: history.status }
      ],
      branchEvidence: {
        success: { teachChild: teachChild.status, similarExercise: similarExercise.status, exerciseAnswer: exerciseAnswer.status, checkMastery: checkMastery.status, history: history.status },
        quotaExceeded: { responseStatus: quotaExceeded.status, response: quotaExceeded.body },
        unpaidGuard: { responseStatus: unpaidGuard.status, response: unpaidGuard.body },
        missingQuestion: { responseStatus: missingQuestion.status, response: missingQuestion.body },
        invalidAnswer: { responseStatus: invalidAnswer.status, response: invalidAnswer.body },
        providerFailure: { responseStatus: providerFailure.status, response: providerFailure.body }
      },
      dbReadback: {
        question: questionReadback,
        reportCard,
        interactions: history.body.items.map((item) => ({ id: item.id, actionType: item.actionType, status: item.status, submittedAnswer: item.submittedAnswer || null })),
        providerFailureInteraction: api.db.assertReadback('question_interactions', 'interaction-v143-05-provider-failure', { status: 'failed' })
      },
      localOnly: {
        paymentAdapter: api.payment.assertLocalOnly(),
        cloudAdapter: api.cloud.assertLocalOnly(),
        remoteCalls: []
      }
    };
    writeEvidence('V143-05-repair-drawer-apis.json', evidence);
  });
});

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
