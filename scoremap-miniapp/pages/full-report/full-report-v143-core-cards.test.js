const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFullReportPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- full-report-v143-core-cards';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

test('V143-13 C10 renders five core value cards from full-report and questions APIs', () => {
  const client = createMiniappApiClient();
  client.request('POST', '/api/payments/create', {
    orderId: 'order-v143-c10',
    paymentType: 'full',
    source: 'V143-13-fixture'
  });
  client.request('POST', '/api/diagnosis-orders/order-v143-c10/generate-full', {
    source: 'V143-13-fixture'
  });

  const page = createFullReportPageState(client, { orderId: 'order-v143-c10' });
  const load = page.loadFullReport();
  const questions = page.loadWrongQuestions();
  const state = page.getState();
  const share = page.shareReport();
  const save = page.saveReport();
  const drawer = page.openRepairDrawer(state.wrongQuestionCards[0].questionId);
  const pdfControl = state.controls.find((control) => control.id === 'export-pdf');

  assert.equal(load.status, 'FULL_REPORT_READY');
  assert.equal(load.valueCardCount, 5);
  assert.equal(questions.status, 'QUESTIONS_READY');
  assert.equal(state.uiReference.id, 'UI143-C10A');
  assert.deepEqual(state.valueCards.map((card) => card.id), [
    'recoverable-score',
    'evidence-anchors',
    'improvement-priority',
    'wrong-question-focus',
    'teacher-intervention'
  ]);
  assert.match(state.valueCards[0].value, /\d+-\d+分/);
  assert.equal(state.wrongQuestionCards.length >= 2, true);
  assert.equal(share.status, 'SHARE_READY');
  assert.equal(save.status, 'SAVED');
  assert.equal(save.dbReadback.savedReport, true);
  assert.equal(drawer.status, 'REPAIR_DRAWER_READY');
  assert.equal(drawer.drawerState, 'diagnosis');
  assert.equal(pdfControl.visible, false);
  assert.match(pdfControl.reason, /隐藏/);
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-v143-c10/full-report'));
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-v143-c10/questions'));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/reports/order-v143-c10/save'));

  writeEvidence('V143-13-c10-core-cards.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['REQ143-004', 'REQ143-006', 'REQ143-007', 'REQ143-008'],
    apiIds: ['API143-010', 'API143-016'],
    uiReferences: ['UI143-C10A'],
    ownerScenarioIds: ['O143-04'],
    renderedState: state,
    controlEvidence: [
      { controlId: 'share-report', result: share },
      { controlId: 'save-report', result: save },
      { controlId: 'open-repair-drawer', result: drawer },
      { controlId: 'export-pdf-hidden', result: pdfControl }
    ],
    apiCalls: client.calls,
    limitation: 'Structural/state evidence verifies C10 data binding and controls. Pixel-perfect WeChat screenshot comparison remains assigned to V143-18.'
  });
});

test('V143-14 C10 repair drawer advances through four C13 steps and writes mastery back to report', () => {
  const client = createMiniappApiClient();
  const orderId = 'order-v143-c10-repair';
  client.request('POST', '/api/payments/create', {
    orderId,
    paymentType: 'full',
    source: 'V143-14-fixture'
  });
  client.request('POST', `/api/diagnosis-orders/${orderId}/generate-full`, {
    source: 'V143-14-fixture'
  });

  const page = createFullReportPageState(client, { orderId });
  page.loadFullReport();
  page.loadWrongQuestions();
  const beforeState = page.getState();
  const questionId = beforeState.wrongQuestionCards[0].questionId;
  const opened = page.openRepairDrawer(questionId);
  const explanation = page.advanceRepairDrawer();
  const exercise = page.advanceRepairDrawer();
  const mastery = page.submitRepairAnswer(exercise.repairDrawer.exercise.correctOption);
  const afterState = page.getState();
  const updatedCard = afterState.wrongQuestionCards.find((card) => card.questionId === questionId);
  const decisionReadback = client.store.read('diagnosis_decisions', `decision-${orderId}-full`);
  const decisionCard = decisionReadback.full.wrongQuestionCards.find((card) => card.questionId === questionId);
  const questionReadback = client.store.read('diagnosis_questions', questionId);

  assert.equal(opened.status, 'REPAIR_DRAWER_READY');
  assert.equal(opened.repairDrawer.step, 'diagnosis');
  assert.deepEqual(opened.repairDrawer.steps.map((step) => step.uiReference), ['UI143-C13-1', 'UI143-C13-2', 'UI143-C13-3', 'UI143-C13-4']);
  assert.equal(explanation.status, 'REPAIR_EXPLANATION_READY');
  assert.equal(explanation.repairDrawer.step, 'explanation');
  assert.equal(exercise.status, 'REPAIR_EXERCISE_READY');
  assert.equal(exercise.repairDrawer.step, 'exercise');
  assert.equal(mastery.status, 'REPAIR_MASTERY_WRITTEN_BACK');
  assert.equal(mastery.repairDrawer.step, 'mastery');
  assert.equal(mastery.repairDrawer.masteryStatus, 'initial_mastery');
  assert.equal(updatedCard.masteryStatus, 'initial_mastery');
  assert.equal(decisionCard.masteryStatus, 'initial_mastery');
  assert.equal(questionReadback.masteryStatus, 'initial_mastery');
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path.endsWith('/teach-child')));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path.endsWith('/similar-exercise')));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path.endsWith('/check-mastery')));

  writeEvidence('V143-14-c13-repair-drawer-c10-writeback.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['REQ143-005', 'REQ143-007'],
    apiIds: ['API143-010', 'API143-011', 'API143-012', 'API143-014', 'API143-015'],
    uiReferences: ['UI143-C10B', 'UI143-C13-1', 'UI143-C13-2', 'UI143-C13-3', 'UI143-C13-4'],
    ownerScenarioIds: ['O143-04', 'O143-08'],
    stepEvidence: [
      { step: 'diagnosis', result: opened },
      { step: 'explanation', result: explanation },
      { step: 'exercise', result: exercise },
      { step: 'mastery', result: mastery }
    ],
    c10Writeback: {
      before: beforeState.wrongQuestionCards.find((card) => card.questionId === questionId),
      after: updatedCard,
      decisionCard,
      questionReadback
    },
    apiCalls: client.calls,
    renderedState: afterState,
    localOnly: {
      adapterMode: 'local-mock',
      remoteCalls: []
    },
    limitation: 'Deterministic page-state and local fixture DB readback prove the C13 drawer state machine and C10 mastery writeback. Pixel-perfect WeChat screenshot comparison remains assigned to V143-18.'
  });
});

test('V143-13 C10 remains local-only and has no forbidden remote provider calls', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/full-report/index.js',
    'scoremap-miniapp/pages/full-report/index.wxml',
    'scoremap-miniapp/pages/full-report/index.wxss',
    'scoremap-miniapp/pages/full-report/full-report-v143-core-cards.test.js',
    'scoremap-miniapp/utils/full-report-model.js',
    'scoremap-miniapp/services/api-client.js'
  ];
  const forbiddenRemoteFindings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }
  assert.deepEqual(forbiddenRemoteFindings, []);

  writeEvidence('V143-13-c10-local-only.json', {
    status: 'PASS',
    command,
    localOnly,
    forbiddenRemoteFindings,
    scannedFiles: filesToScan
  });
});
