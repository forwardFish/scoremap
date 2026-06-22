const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { writeJsonEvidence } = require('../../shared/evidence-paths');
const { createLocalAdapters } = require('../src/adapters');
const { createLocalAiAdapter, LocalAiTraceStore, PROMPT_IDS, assertPromptRegistryComplete, containsSecretLikeText } = require('../src/ai');
const { LOCAL_SCHEMA_CONTRACT, TABLES } = require('../src/db/local-json-db');
const { DiagnosisOrdersService } = require('../src/services/diagnosis-orders-service');
const { ReportsService } = require('../src/services/reports-service');
const { QuestionInteractionsService } = require('../src/services/question-interactions-service');

const projectRoot = path.resolve(__dirname, '..', '..');
const command = 'npm --prefix server test -- ai-adapter';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('api-db-llm', name), payload);
}

function makeAdapters() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-t20-'));
  return createLocalAdapters({
    dbPath: path.join(tempRoot, 'scoremap-local-db.json'),
    cloudRootDir: path.join(tempRoot, 'local-cloud')
  });
}

test('T20 prompt registry contains every mandatory local model call id', () => {
  const registry = assertPromptRegistryComplete();
  assert.deepEqual(registry.promptIds, [
    'LLM-PREVIEW-01',
    'LLM-BASIC-02',
    'LLM-FULL-03',
    'LLM-QUESTION-04',
    'LLM-TUTOR-05',
    'LLM-EXERCISE-06',
    'LLM-CHECK-07'
  ]);
  writeEvidence('T20-prompt-registry.json', { status: 'PASS', command, registry });
});

test('T20 local adapter returns deterministic responses and trace rows for all prompts', () => {
  const ai = createLocalAiAdapter();
  const responses = {};
  for (const promptId of PROMPT_IDS) {
    const first = ai.complete({ promptId, input: sampleInput(promptId) });
    const second = ai.complete({ promptId, input: sampleInput(promptId) });
    assert.deepEqual(first.output, second.output);
    assert.equal(first.localOnly, true);
    assert.equal(first.adapter, 'local-deterministic-ai-mock');
    responses[promptId] = first.output;
  }

  const traces = ai.getTraces();
  assert.equal(traces.length, PROMPT_IDS.length * 2);
  for (const promptId of PROMPT_IDS) {
    assert.ok(traces.some((trace) => trace.promptId === promptId && trace.status === 'SUCCESS'));
  }
  assert.equal(containsSecretLikeText(traces), false);
  writeEvidence('T20-deterministic-traces.json', {
    status: 'PASS',
    command,
    promptIds: PROMPT_IDS,
    traceCount: traces.length,
    responses,
    traces
  });
});

test('T20 local adapter records timeout and provider-failure simulations without external calls', () => {
  const ai = createLocalAiAdapter();
  assert.throws(() => ai.complete({ promptId: 'LLM-TUTOR-05', input: { questionId: 'question-timeout' }, simulate: 'timeout' }), /timeout/);
  assert.throws(() => ai.complete({ promptId: 'LLM-EXERCISE-06', input: { questionId: 'question-failure' }, simulate: 'provider_failure' }), /provider failure/);

  const traces = ai.getTraces();
  assert.equal(traces[0].status, 'TIMEOUT');
  assert.equal(traces[0].errorCode, 'LOCAL_AI_TIMEOUT');
  assert.equal(traces[1].status, 'PROVIDER_FAILURE');
  assert.equal(traces[1].errorCode, 'LOCAL_AI_PROVIDER_FAILURE');
  assert.deepEqual(ai.remoteCalls, []);
  writeEvidence('T20-failure-simulation.json', { status: 'PASS', command, traces, remoteCalls: ai.remoteCalls });
});

test('T20 services route preview, basic, and full AI-shaped generation through the adapter', async () => {
  const { db, cloud } = makeAdapters();
  const ai = createLocalAiAdapter();
  const diagnosis = new DiagnosisOrdersService({ db, cloud, ai });
  const reports = new ReportsService({ db, ai });

  const created = diagnosis.createOrder({
    orderId: 'order-t20',
    source: 'T20-ai-adapter',
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  const auth = { orderToken: created.body.orderToken };
  await diagnosis.uploadFiles('order-t20', {
    authorizationAccepted: true,
    files: [{ id: 'upload-t20', content: 'local mock upload bytes' }]
  }, auth);
  const preview = diagnosis.startPreviewAnalysis('order-t20', {}, auth);
  db.update('diagnosis_orders', 'order-t20', { accessLevel: 'full' });
  const basic = reports.getBasicDecision('order-t20', auth);
  const full = reports.generateFullReport('order-t20', { taskId: 'task-full-t20' }, auth);

  assert.equal(preview.statusCode, 200);
  assert.equal(basic.statusCode, 200);
  assert.equal(full.statusCode, 200);
  const traces = ai.getTraces();
  for (const promptId of ['LLM-PREVIEW-01', 'LLM-BASIC-02', 'LLM-FULL-03']) {
    assert.ok(traces.some((trace) => trace.promptId === promptId && trace.status === 'SUCCESS'));
  }
  const decisions = db.find('diagnosis_decisions', (row) => row.orderId === 'order-t20');
  assert.deepEqual(decisions.map((row) => row.promptId).sort(), ['LLM-BASIC-02', 'LLM-FULL-03', 'LLM-PREVIEW-01']);
  writeEvidence('T20-service-routing.json', {
    status: 'PASS',
    command,
    routedPromptIds: decisions.map((row) => row.promptId),
    decisionReadback: decisions,
    traces,
    remoteCalls: ai.remoteCalls
  });
});

test('T20 local-only guard finds no provider endpoint strings or secret-bearing trace payloads', () => {
  const localOnly = assertLocalOnlyEnvironment({ LOCAL_ONLY: 'true', SCOREMAP_ADAPTER_MODE: 'local-mock' });
  const ai = createLocalAiAdapter();
  const result = ai.complete({
    promptId: 'LLM-CHECK-07',
    input: { questionId: 'question-secret-safe', answer: 'B', apiKey: 'sk-test-redacted-value-000000' }
  });
  const traces = ai.getTraces();
  const scannedFiles = [
    'server/src/ai/local-ai-adapter.js',
    'server/src/ai/prompt-registry.js',
    'server/src/ai/trace-store.js',
    'server/src/services/diagnosis-orders-service.js',
    'server/src/services/reports-service.js',
    'server/test/ai-adapter.test.js'
  ];
  const forbiddenRemoteFindings = [];
  for (const relativePath of scannedFiles) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }

  assert.equal(result.localOnly, true);
  assert.equal(traces[0].requestSummary.fields.input.fields.apiKey.redacted, true);
  assert.equal(containsSecretLikeText(traces), false);
  assert.deepEqual(forbiddenRemoteFindings, []);
  writeEvidence('T20-local-only-secret-guard.json', {
    status: 'PASS',
    command,
    localOnly,
    scannedFiles,
    forbiddenRemoteFindings,
    secretFindings: [],
    traceSecretSafe: true,
    traces
  });
});

test('V143-02 local schema and AI report contracts cover full report, repair state, quotas, and teacher intervention', async () => {
  const { db, cloud } = makeAdapters();
  const ai = createLocalAiAdapter({ traceStore: new LocalAiTraceStore({ db }) });
  const diagnosis = new DiagnosisOrdersService({ db, cloud, ai });
  const reports = new ReportsService({ db, ai });
  const questions = new QuestionInteractionsService({ db, ai });

  assert.deepEqual(Object.keys(LOCAL_SCHEMA_CONTRACT).sort(), [...TABLES].sort());
  assert.deepEqual(LOCAL_SCHEMA_CONTRACT.diagnosis_decisions.includes('full'), true);
  assert.deepEqual(LOCAL_SCHEMA_CONTRACT.diagnosis_questions.includes('masteryStatus'), true);
  assert.deepEqual(LOCAL_SCHEMA_CONTRACT.question_interactions.includes('actionType'), true);
  assert.deepEqual(LOCAL_SCHEMA_CONTRACT.question_interactions.includes('answerFeedback'), true);

  const created = diagnosis.createOrder({
    orderId: 'order-v143-02',
    source: 'V143-02-local-schema-contract',
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  const auth = { orderToken: created.body.orderToken };
  await diagnosis.uploadFiles('order-v143-02', {
    authorizationAccepted: true,
    files: [{ id: 'upload-v143-02', content: 'local mock upload bytes' }]
  }, auth);
  diagnosis.startPreviewAnalysis('order-v143-02', {}, auth);
  db.update('diagnosis_orders', 'order-v143-02', { accessLevel: 'full' });

  const full = reports.generateFullReport('order-v143-02', { taskId: 'task-full-v143-02' }, auth);
  assert.equal(full.statusCode, 200);
  const card = full.body.wrongQuestionCards[0];
  assert.ok(card);
  assert.equal(card.quota.total, 3);
  assert.equal(full.body.quota.report.total, 10);

  const tutor = questions.createInteraction('order-v143-02', card.id, {
    interactionId: 'interaction-v143-02-teacher',
    actionType: 'teach_child'
  }, auth);
  const exercise = questions.createInteraction('order-v143-02', card.id, {
    interactionId: 'interaction-v143-02-repair-exercise',
    actionType: 'generate_similar_exercise'
  }, auth);
  const answer = questions.submitExerciseAnswer('order-v143-02', card.id, exercise.body.interactionId, {
    submittedAnswer: 'B'
  }, auth);

  assert.equal(tutor.statusCode, 201);
  assert.equal(exercise.statusCode, 201);
  assert.equal(answer.statusCode, 200);
  assert.equal(tutor.body.response.mode, 'fixed-follow-up');
  assert.equal(answer.body.correctness, true);

  const orderReadback = db.assertReadback('diagnosis_orders', 'order-v143-02', { questionInteractionQuotaUsed: 2 });
  const questionReadback = db.assertReadback('diagnosis_questions', card.id, { masteryStatus: 'initial_mastery' });
  const tutorReadback = db.assertReadback('question_interactions', 'interaction-v143-02-teacher', { actionType: 'teach_child' });
  const exerciseReadback = db.assertReadback('question_interactions', 'interaction-v143-02-repair-exercise', { submittedAnswer: 'B' });
  const fullDecision = db.assertReadback('diagnosis_decisions', 'decision-order-v143-02-full', { level: 'full' });
  const traces = db.all('ai_model_traces');

  writeEvidence('V143-02-local-schema-ai-report-contract.json', {
    status: 'PASS',
    command,
    taskId: 'V143-02',
    requirementIds: ['REQ143-002'],
    apiContractBasis: ['API143-010', 'API143-011', 'API143-012', 'API143-013', 'API143-014', 'API143-015'],
    schemaContract: LOCAL_SCHEMA_CONTRACT,
    readback: {
      order: orderReadback,
      fullDecision,
      question: questionReadback,
      teacherIntervention: tutorReadback,
      repairExercise: exerciseReadback,
      traces
    },
    assertions: [
      'Full report decision persists wrong-question card summaries and report quota.',
      'Diagnosis question cards persist masteryStatus after answer feedback and per-question quota state.',
      'Teacher intervention uses fixed teach_child action through the local AI adapter.',
      'Repair exercise answer persists answer feedback without remote provider calls.'
    ]
  });
});

function sampleInput(promptId) {
  return {
    orderId: 'order-t20-sample',
    grade: 'grade-5',
    subject: 'math',
    questionId: 'question-t20-sample',
    interactionId: 'interaction-t20-sample',
    action: 'explain_error',
    answer: promptId === 'LLM-CHECK-07' ? 'B' : undefined,
    uploadCount: 1,
    previewModuleCount: 3,
    basicSummary: 'Local basic decision is ready.',
    knowledgePoint: 'Multi-step calculation'
  };
}
