const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createAiExercisePageState, AI_FEEDBACK_ROUTE, AI_EXERCISE_ROUTE } = require('./index');
const { createAiExerciseFeedbackPageState, FULL_REPORT_ROUTE } = require('../ai-exercise-feedback');
const { runAiExerciseFeedbackVisualEvidence } = require('./visual-ai-exercise-feedback');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- ai-exercise-feedback';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

test('T28 exercise page generates a similar exercise with four clickable options and LLM-EXERCISE-06 trace', () => {
  const client = createMiniappApiClient();
  const page = createAiExercisePageState(client, { orderId: 'order-t28-exercise' });
  const state = page.getState();
  const selected = page.selectOption(state.exercise.options[1].text);
  const selectedState = page.getState();

  assert.equal(state.uiReference.id, 'V13-UI-EXERCISE');
  assert.equal(state.exercise.options.length, 4);
  assert.ok(state.controls.some((control) => control.id === 'submit-answer'));
  assert.ok(state.controls.some((control) => control.id === 'open-question-context'));
  assert.equal(selected.status, 'OPTION_SELECTED');
  assert.equal(selectedState.submitEnabled, true);

  const exerciseTrace = client.store
    .list('ai_model_traces')
    .find((trace) => trace.promptId === 'LLM-EXERCISE-06');
  assert.ok(exerciseTrace);
  assert.equal(exerciseTrace.localOnly, true);

  writeEvidence('T28-similar-exercise.json', {
    status: 'PASS',
    command,
    requirementIds: ['V13-R06', 'V13-R12'],
    renderedState: selectedState,
    selected,
    trace: exerciseTrace,
    apiCalls: client.calls
  });
});

test('T28 answer submission records feedback data, DB readback, and LLM-CHECK-07 trace', () => {
  const client = createMiniappApiClient();
  const page = createAiExercisePageState(client, { orderId: 'order-t28-answer' });
  const state = page.getState();
  page.selectOption(state.exercise.options.find((option) => option.text === state.exercise.correctOption).text);
  const submitted = page.submitAnswer();
  const answered = client.store.read('question_interactions', state.interactionId);
  const feedbackPage = createAiExerciseFeedbackPageState(client, {
    orderId: state.orderId,
    questionId: state.questionId,
    interactionId: state.interactionId
  });
  const feedbackState = feedbackPage.getState();
  const history = feedbackPage.openInteractionRecord();
  const retry = feedbackPage.retrySimilarExercise();
  const report = feedbackPage.returnReport();

  assert.equal(submitted.status, 'ANSWER_SUBMITTED');
  assert.equal(submitted.targetRoute, AI_FEEDBACK_ROUTE);
  assert.equal(answered.answerPromptId, 'LLM-CHECK-07');
  assert.equal(answered.answerFeedback.correct, true);
  assert.equal(feedbackState.uiReference.id, 'V13-UI-FEEDBACK');
  assert.equal(feedbackState.result.correct, true);
  assert.ok(feedbackState.explanation);
  assert.equal(history.status, 'RECORD_OPENED');
  assert.equal(retry.targetRoute, AI_EXERCISE_ROUTE);
  assert.equal(report.targetRoute, FULL_REPORT_ROUTE);

  const answerTrace = client.store.read('ai_model_traces', answered.answerTraceId);
  assert.equal(answerTrace.promptId, 'LLM-CHECK-07');
  assert.equal(answerTrace.localOnly, true);

  writeEvidence('T28-answer-feedback.json', {
    status: 'PASS',
    command,
    requirementIds: ['V13-R06', 'V13-R12'],
    submitted,
    readback: {
      interaction: answered,
      answerTrace,
      feedbackState,
      history
    },
    controls: { retry, report },
    apiCalls: client.calls
  });
});

test('T28 duplicate answer and answer-before-exercise branches are handled', () => {
  const duplicateClient = createMiniappApiClient();
  const duplicatePage = createAiExercisePageState(duplicateClient, { orderId: 'order-t28-duplicate' });
  const duplicateState = duplicatePage.getState();
  duplicatePage.selectOption(duplicateState.exercise.options[0].text);
  const firstSubmit = duplicatePage.submitAnswer();
  const duplicateSubmit = duplicatePage.submitAnswer();

  const missingClient = createMiniappApiClient();
  missingClient.request('POST', '/api/payments/create', {
    orderId: 'order-t28-missing',
    paymentType: 'full',
    source: 'T28-negative-fixture'
  });
  missingClient.request('POST', '/api/diagnosis-orders/order-t28-missing/generate-full', {
    source: 'T28-negative-fixture'
  });
  missingClient.request('GET', '/api/diagnosis-orders/order-t28-missing/questions');
  const missingResponse = missingClient.request(
    'POST',
    '/api/diagnosis-orders/order-t28-missing/questions/order-t28-missing-q1/exercise-answer',
    { interactionId: 'missing-exercise', submittedAnswer: 'A' }
  );

  assert.equal(firstSubmit.status, 'ANSWER_SUBMITTED');
  assert.equal(duplicateSubmit.status, 'DUPLICATE_ANSWER');
  assert.equal(duplicateSubmit.response.code, 'EXERCISE_ALREADY_ANSWERED');
  assert.equal(missingResponse.status, 404);
  assert.equal(missingResponse.body.code, 'EXERCISE_NOT_FOUND');

  writeEvidence('T28-negative-branches.json', {
    status: 'PASS',
    command,
    requirementIds: ['V13-R06'],
    duplicateAnswer: duplicateSubmit,
    answerBeforeExercise: missingResponse,
    duplicateApiCalls: duplicateClient.calls,
    missingApiCalls: missingClient.calls
  });
});

test('T28 structural visual evidence for _4 and _2 targets is generated', () => {
  const metrics = runAiExerciseFeedbackVisualEvidence(['ai-exercise-feedback']);
  const exercise = metrics.find((item) => item.reference.includes('/_4/'));
  const feedback = metrics.find((item) => item.reference.includes('/_2/'));

  assert.equal(exercise.status, 'PASS_NEEDS_MANUAL_UI_REVIEW');
  assert.equal(exercise.structuralChecks.hasFourOptions, true);
  assert.equal(exercise.structuralChecks.hasSubmit, true);
  assert.equal(feedback.status, 'PASS_NEEDS_MANUAL_UI_REVIEW');
  assert.equal(feedback.structuralChecks.hasResult, true);
  assert.equal(feedback.structuralChecks.hasRetry, true);
  assert.equal(feedback.structuralChecks.hasReturnReport, true);
  assert.ok(fs.existsSync(path.join(projectRoot, exercise.actual)));
  assert.ok(fs.existsSync(path.join(projectRoot, feedback.actual)));

  writeEvidence('T28-v13-exercise-feedback-visual-structure.json', {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command,
    requirementIds: ['V13-R12'],
    screens: metrics,
    limitation: 'T28 creates deterministic structural visual evidence for _4 and _2. T30 remains responsible for raster screenshot diff and pixel comparison.'
  });
});
