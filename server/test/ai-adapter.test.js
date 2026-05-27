const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { writeJsonEvidence } = require('../../shared/evidence-paths');
const { createLocalAdapters } = require('../src/adapters');
const { createLocalAiAdapter, PROMPT_IDS, assertPromptRegistryComplete, containsSecretLikeText } = require('../src/ai');
const { DiagnosisOrdersService } = require('../src/services/diagnosis-orders-service');
const { ReportsService } = require('../src/services/reports-service');

const projectRoot = path.resolve(__dirname, '..', '..');
const command = 'npm --prefix server test -- ai-adapter prompt-registry';

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

test('T20 services route preview, basic, and full AI-shaped generation through the adapter', () => {
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
  diagnosis.uploadFiles('order-t20', {
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
