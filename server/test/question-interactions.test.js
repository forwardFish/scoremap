const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../shared/evidence-paths');
const { createLocalAdapters } = require('../src/adapters');
const { createLocalAiAdapter, LocalAiTraceStore } = require('../src/ai');
const { DiagnosisOrdersService } = require('../src/services/diagnosis-orders-service');
const { ReportsService } = require('../src/services/reports-service');
const { QuestionInteractionsService } = require('../src/services/question-interactions-service');

const projectRoot = path.resolve(__dirname, '..', '..');
const command = 'npm --prefix server test -- question-interactions db-readback';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('api-db-llm', name), payload);
}

function makeHarness(suffix) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `scoremap-t21-${suffix}-`));
  const adapters = createLocalAdapters({
    dbPath: path.join(tempRoot, 'scoremap-local-db.json'),
    cloudRootDir: path.join(tempRoot, 'local-cloud')
  });
  const ai = createLocalAiAdapter({ traceStore: new LocalAiTraceStore({ db: adapters.db }) });
  const diagnosis = new DiagnosisOrdersService({ ...adapters, ai });
  const reports = new ReportsService({ db: adapters.db, ai });
  const questions = new QuestionInteractionsService({ db: adapters.db, ai });
  return { ...adapters, ai, diagnosis, reports, questions };
}

function createFullOrder(api, suffix) {
  const created = api.diagnosis.createOrder({
    orderId: `order-t21-${suffix}`,
    source: 'T21-db-schema',
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  assert.equal(created.statusCode, 201);
  const auth = { orderToken: created.body.orderToken };
  const upload = api.diagnosis.uploadFiles(created.body.orderId, {
    authorizationAccepted: true,
    files: [{ id: `upload-t21-${suffix}`, content: 'local mock upload bytes' }]
  }, auth);
  assert.equal(upload.statusCode, 200);
  assert.equal(api.diagnosis.startPreviewAnalysis(created.body.orderId, {}, auth).statusCode, 200);
  api.db.update('diagnosis_orders', created.body.orderId, { accessLevel: 'full' });
  assert.equal(api.reports.generateFullReport(created.body.orderId, { taskId: `task-full-t21-${suffix}` }, auth).statusCode, 200);
  return { orderId: created.body.orderId, auth };
}

test('T21 persists wrong-question cards, interactions, exercise answers, quota, and AI traces with direct readback', () => {
  const api = makeHarness('success');
  const { orderId, auth } = createFullOrder(api, 'success');
  const cards = api.questions.ensureQuestionCards(orderId, {}, auth);
  assert.ok([200, 201].includes(cards.statusCode));
  const question = cards.body.questions[0];
  const tutor = api.questions.createInteraction(orderId, question.id, {
    interactionId: 'interaction-t21-tutor',
    actionType: 'teach_child'
  }, auth);
  const exercise = api.questions.createInteraction(orderId, question.id, {
    interactionId: 'interaction-t21-exercise',
    actionType: 'generate_similar_exercise'
  }, auth);
  const answer = api.questions.submitExerciseAnswer(orderId, question.id, exercise.body.interactionId, {
    submittedAnswer: 'B'
  }, auth);

  assert.equal(tutor.statusCode, 201);
  assert.equal(exercise.statusCode, 201);
  assert.equal(answer.statusCode, 200);

  const orderReadback = api.db.assertReadback('diagnosis_orders', orderId, { questionInteractionQuotaUsed: 2 });
  const questionReadback = api.db.assertReadback('diagnosis_questions', question.id, { questionInteractionQuotaUsed: 2 });
  const tutorReadback = api.db.assertReadback('question_interactions', 'interaction-t21-tutor', { status: 'success' });
  const exerciseReadback = api.db.assertReadback('question_interactions', 'interaction-t21-exercise', { submittedAnswer: 'B' });
  const traces = api.db.all('ai_model_traces');
  for (const promptId of ['LLM-QUESTION-04', 'LLM-TUTOR-05', 'LLM-EXERCISE-06', 'LLM-CHECK-07']) {
    assert.ok(traces.some((trace) => trace.promptId === promptId && trace.localOnly === true), promptId);
  }
  assert.equal(orderReadback.questionInteractionQuotaTotal, 10);
  assert.equal(orderReadback.questionInteractionQuotaRemaining, 8);
  assert.equal(questionReadback.questionInteractionQuotaTotal, 3);
  assert.equal(questionReadback.questionInteractionQuotaRemaining, 1);
  assert.deepEqual(exerciseReadback.exercise.options, ['A', 'B', 'C', 'D']);
  assert.equal(exerciseReadback.correctness, true);

  writeEvidence('T21-db-readback.json', {
    status: 'PASS',
    command,
    tables: ['diagnosis_questions', 'question_interactions', 'ai_model_traces'],
    dbReadback: {
      order: orderReadback,
      question: questionReadback,
      tutorInteraction: tutorReadback,
      exerciseInteraction: exerciseReadback,
      aiModelTraces: traces
    }
  });
});

test('T21 failed validation, entitlement, provider, and quota branches do not increment successful usage counters', () => {
  const api = makeHarness('failures');
  const { orderId, auth } = createFullOrder(api, 'failures');
  const cards = api.questions.ensureQuestionCards(orderId, {}, auth);
  const question = cards.body.questions[0];

  const invalid = api.questions.createInteraction(orderId, question.id, { actionType: 'open_chat' }, auth);
  const previewOnlyOrder = api.diagnosis.createOrder({
    orderId: 'order-t21-preview-only',
    source: 'T21-db-schema',
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  const entitlement = api.questions.ensureQuestionCards(previewOnlyOrder.body.orderId, {}, { orderToken: previewOnlyOrder.body.orderToken });
  const provider = api.questions.createInteraction(orderId, question.id, {
    interactionId: 'interaction-t21-provider-failure',
    actionType: 'teach_child',
    simulate: 'provider_failure'
  }, auth);

  api.questions.createInteraction(orderId, question.id, { interactionId: 'interaction-t21-q1', actionType: 'teach_child' }, auth);
  api.questions.createInteraction(orderId, question.id, { interactionId: 'interaction-t21-q2', actionType: 'teach_child' }, auth);
  api.questions.createInteraction(orderId, question.id, { interactionId: 'interaction-t21-q3', actionType: 'teach_child' }, auth);
  const quotaExceeded = api.questions.createInteraction(orderId, question.id, {
    interactionId: 'interaction-t21-quota-exceeded',
    actionType: 'teach_child'
  }, auth);

  assert.equal(invalid.statusCode, 400);
  assert.equal(entitlement.statusCode, 403);
  assert.equal(provider.statusCode, 502);
  assert.equal(quotaExceeded.statusCode, 429);

  const orderReadback = api.db.assertReadback('diagnosis_orders', orderId, { questionInteractionQuotaUsed: 3 });
  const questionReadback = api.db.assertReadback('diagnosis_questions', question.id, { questionInteractionQuotaUsed: 3 });
  const failedInteraction = api.db.assertReadback('question_interactions', 'interaction-t21-provider-failure', { status: 'failed' });
  assert.equal(api.db.read('question_interactions', 'interaction-t21-quota-exceeded'), null);
  assert.equal(orderReadback.questionInteractionQuotaRemaining, 7);
  assert.equal(questionReadback.questionInteractionQuotaRemaining, 0);

  writeEvidence('T21-negative-branches-quota.json', {
    status: 'PASS',
    command,
    branches: {
      invalid: invalid.body,
      entitlement: entitlement.body,
      provider: provider.body,
      quotaExceeded: quotaExceeded.body
    },
    dbReadback: {
      order: orderReadback,
      question: questionReadback,
      failedInteraction,
      traces: api.db.all('ai_model_traces')
    },
    assertion: 'Only successful tutor/exercise interactions incremented report and question quota counters.'
  });
});
