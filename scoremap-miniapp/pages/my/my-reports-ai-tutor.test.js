const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createReportsPageState } = require('../reports');
const { createMyPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- my-reports-ai-tutor';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

test('T29 my page and reports list expose full-report tutor quota, saved recovery, and history entry', () => {
  const client = createMiniappApiClient();
  const myPage = createMyPageState(client);
  const myState = myPage.getState();
  const reportsPage = createReportsPageState(client);
  const load = reportsPage.loadReports();
  const reportsState = reportsPage.getState();
  const fullCard = reportsState.cards.find((card) => card.orderId === 'order-t12-full');
  const reportResume = reportsPage.openReportCard('order-t12-full');
  const wrongQuestionResume = reportsPage.openReportCard('order-t12-full', { resume: 'wrongQuestion' });
  const historyResume = reportsPage.openReportCard('order-t12-full', { resume: 'history' });
  const historyApiCall = client.calls.find((call) => call.path.includes('/questions/order-t12-full-q1/interactions'));

  assert.equal(load.status, 'REPORTS_READY');
  assert.ok(myState.recentReports.some((item) => item.orderId === 'order-t12-full' && item.aiTutor.formalEntitlement));
  assert.equal(fullCard.accessLevel, 'full');
  assert.equal(fullCard.savedReport, true);
  assert.equal(fullCard.aiTutor.formalEntitlement, true);
  assert.equal(fullCard.aiTutor.reportQuota.remaining, 8);
  assert.equal(fullCard.aiTutor.reportQuota.total, 10);
  assert.equal(fullCard.aiTutor.wrongQuestionCount >= 2, true);
  assert.equal(fullCard.aiTutor.historyCount >= 2, true);
  assert.equal(reportResume.targetRoute, '/pages/full-report/index');
  assert.equal(wrongQuestionResume.targetRoute, '/pages/wrong-question/index');
  assert.equal(wrongQuestionResume.query.questionId, 'order-t12-full-q1');
  assert.equal(historyResume.targetRoute, '/pages/ai-tutor/index');
  assert.equal(historyResume.query.tab, 'history');
  assert.ok(historyApiCall);

  writeEvidence('T29-my-reports-quota-history.json', {
    status: 'PASS',
    command,
    requirementIds: ['V13-R03'],
    ownerScenarioIds: ['V13-O22'],
    acceptance: {
      myReportsShowsQuota: 'PASS',
      savedFullReportCanResume: 'PASS',
      wrongQuestionResumeTarget: 'PASS',
      interactionHistoryEntryPoint: 'PASS'
    },
    renderedState: {
      my: myState,
      reports: reportsState
    },
    navigationEvidence: {
      reportResume,
      wrongQuestionResume,
      historyResume
    },
    apiEvidence: client.calls.filter((call) => call.path.includes('/api/')),
    dbReadback: {
      fullOrder: client.store.read('diagnosis_orders', 'order-t12-full'),
      questions: client.store.list('diagnosis_questions').filter((row) => row.orderId === 'order-t12-full'),
      interactions: client.store.list('question_interactions').filter((row) => row.orderId === 'order-t12-full')
    }
  });
});

test('T29 basic and free report records do not expose formal tutor entitlement', () => {
  const client = createMiniappApiClient();
  createMyPageState(client).loadSummary();
  client.store.upsert('diagnosis_orders', {
    id: 'order-t29-free-preview',
    ownerId: 'local-user-scoremap-t06',
    title: 'Free preview only',
    status: 'preview_done',
    accessLevel: 'preview',
    savedReport: true,
    createdAt: '2026-05-24T09:00:00Z'
  });
  const reportsPage = createReportsPageState(client);
  reportsPage.loadReports();
  const state = reportsPage.getState();
  const basicCard = state.cards.find((card) => card.orderId === 'order-t29-basic-only');
  const freeCard = state.cards.find((card) => card.orderId === 'order-t29-free-preview');
  const basicHistory = reportsPage.openReportCard('order-t29-basic-only', { resume: 'history' });
  const freeHistory = reportsPage.openReportCard('order-t29-free-preview', { resume: 'history' });

  assert.equal(basicCard.accessLevel, 'basic');
  assert.equal(basicCard.aiTutor.formalEntitlement, false);
  assert.equal(basicCard.resumeTargets.find((target) => target.id === 'resume-ai-tutor-history').enabled, false);
  assert.equal(freeCard.accessLevel, 'preview');
  assert.equal(freeCard.aiTutor.formalEntitlement, false);
  assert.notEqual(basicHistory.targetRoute, '/pages/ai-tutor/index');
  assert.notEqual(freeHistory.targetRoute, '/pages/ai-tutor/index');
  assert.equal(client.store.list('question_interactions').some((row) => row.orderId === 'order-t29-basic-only'), false);

  writeEvidence('T29-basic-free-no-formal-entitlement.json', {
    status: 'PASS',
    command,
    requirementIds: ['V13-R02'],
    ownerScenarioIds: ['V13-O21', 'V13-O22'],
    acceptance: {
      basicDoesNotExposeFormalTutor: 'PASS',
      freeDoesNotExposeFormalTutor: 'PASS',
      lockedHistoryDoesNotNavigateToAiTutor: 'PASS'
    },
    renderedCards: {
      basicCard,
      freeCard
    },
    navigationEvidence: {
      basicHistory,
      freeHistory
    },
    dbReadback: {
      basicOrder: client.store.read('diagnosis_orders', 'order-t29-basic-only'),
      freeOrder: client.store.read('diagnosis_orders', 'order-t29-free-preview'),
      interactionsForBasic: client.store.list('question_interactions').filter((row) => row.orderId === 'order-t29-basic-only')
    }
  });
});
