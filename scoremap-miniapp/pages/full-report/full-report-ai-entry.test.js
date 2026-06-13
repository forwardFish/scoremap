const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFullReportPageState, AI_TUTOR_ROUTE, WRONG_QUESTION_ROUTE } = require('./index');
const { runV13FullReportVisualEvidence } = require('./visual-full-report-pdf');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- full-report-ai-entry';
const v143FullReportUiId = 'UI143-C10A';
const v143FullReportReference = 'docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

function absoluteEvidencePath(relativePath) {
  return path.join(projectRoot, relativePath);
}

test('T25 full report v1.4.3 renders wrong-question cards and AI tutor entry navigation', () => {
  const client = createMiniappApiClient();
  client.request('POST', '/api/payments/create', {
    orderId: 'order-t25-ai-entry',
    paymentType: 'full',
    source: 'T25-fixture'
  });
  client.request('POST', '/api/diagnosis-orders/order-t25-ai-entry/generate-full', {
    source: 'T25-fixture'
  });

  const page = createFullReportPageState(client, { orderId: 'order-t25-ai-entry' });
  const load = page.loadFullReport();
  const questions = page.loadWrongQuestions();
  const state = page.getState();
  const firstCard = state.wrongQuestionCards[0];
  const detailNav = page.openWrongQuestion(firstCard.questionId);
  const aiNav = page.openAiTutorFromCard(firstCard.questionId);

  assert.equal(load.status, 'FULL_REPORT_READY');
  assert.equal(questions.status, 'QUESTIONS_READY');
  assert.equal(state.title, '完整提分报告');
  assert.equal(state.uiReference.id, v143FullReportUiId);
  assert.equal(state.uiReference.source, v143FullReportReference);
  assert.equal(state.wrongQuestionCards.length >= 2, true);
  assert.equal(state.wrongQuestionCards.every((card) => card.aiEntryText === '让 AI 老师讲给孩子听'), true);
  assert.equal(detailNav.targetRoute, WRONG_QUESTION_ROUTE);
  assert.equal(aiNav.targetRoute, AI_TUTOR_ROUTE);
  assert.equal(aiNav.query.questionId, firstCard.questionId);
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-t25-ai-entry/questions'));

  writeEvidence('T25-full-report-ai-entry.json', {
    status: 'PASS',
    command,
    requirementIds: ['V13-R01', 'V13-R09', 'REQ143-007'],
    uiReferences: [v143FullReportUiId],
    uiReference: state.uiReference,
    cardCount: state.wrongQuestionCards.length,
    renderedState: state,
    pageJumpEvidence: [
      { controlId: 'open-wrong-question-card', result: detailNav },
      { controlId: 'open-ai-tutor-from-card', result: aiNav }
    ],
    apiCalls: client.calls
  });
});

test('T25 full report v1.4.3 share, save, and hidden PDF export behavior works', () => {
  const client = createMiniappApiClient();
  client.request('POST', '/api/payments/create', {
    orderId: 'order-t25-controls',
    paymentType: 'full',
    source: 'T25-fixture'
  });

  const page = createFullReportPageState(client, { orderId: 'order-t25-controls' });
  const state = page.getState();
  const share = page.shareReport();
  const save = page.saveReport();
  const pdfHiddenBeforeExport = state.controls.find((control) => control.id === 'export-pdf');
  const pdf = page.exportPdf();
  const stateAfterExport = page.getState();
  const pdfReadyEntry = stateAfterExport.controls.find((control) => control.id === 'pdf-export-entry');
  const pdfPath = absoluteEvidencePath(pdf.filePath);

  assert.equal(state.controls.find((control) => control.id === 'share-report').visible, true);
  assert.equal(state.controls.find((control) => control.id === 'save-report').visible, true);
  assert.equal(pdfHiddenBeforeExport.visible, false);
  assert.match(pdfHiddenBeforeExport.reason, /隐藏/);
  assert.equal(share.status, 'SHARE_READY');
  assert.equal(save.status, 'SAVED');
  assert.equal(save.dbReadback.savedReport, true);
  assert.equal(pdf.status, 'PDF_READY');
  assert.equal(pdfReadyEntry.visible, true);
  assert.equal(pdfReadyEntry.status, 'ready');
  assert.equal(pdf.dbReadback.format, 'application/pdf');
  assert.ok(fs.existsSync(pdfPath));
  assert.equal(fs.readFileSync(pdfPath, 'utf8').slice(0, 8), '%PDF-1.4');

  writeEvidence('T25-share-save-export.json', {
    status: 'PASS',
    command,
    requirementIds: ['V13-R09', 'REQ143-006', 'REQ143-007'],
    uiReferences: [v143FullReportUiId],
    visibleControls: state.controls.filter((control) => control.visible !== false),
    hiddenControls: [pdfHiddenBeforeExport],
    behaviorEvidence: { share, save, pdf, pdfReadyEntry },
    localPdf: {
      path: pdf.filePath,
      exists: fs.existsSync(pdfPath),
      header: fs.readFileSync(pdfPath, 'utf8').slice(0, 8)
    }
  });
});

test('T25 full report v1.4.3 structural visual evidence for C10 is generated', () => {
  const [metrics] = runV13FullReportVisualEvidence(['v13-full-report']);

  assert.equal(metrics.status, 'PASS_NEEDS_MANUAL_UI_REVIEW');
  assert.equal(metrics.reference, v143FullReportReference);
  assert.equal(metrics.structuralChecks.hasV143Reference, true);
  assert.equal(metrics.structuralChecks.hasWrongQuestionCards, true);
  assert.equal(metrics.structuralChecks.hidesPdfButton, true);
  assert.ok(fs.existsSync(path.join(projectRoot, metrics.actual)));
  assert.ok(fs.existsSync(path.join(projectRoot, metrics.diff)));

  writeEvidence('T25-v13-full-report-visual-structure.json', {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command,
    requirementIds: ['V13-R09', 'REQ143-007', 'REQ143-009'],
    uiReferences: [v143FullReportUiId],
    reference: metrics.reference,
    actual: metrics.actual,
    diff: metrics.diff,
    metrics: 'docs/auto-execute/evidence/frontend-page/visual/v13-full-report/metrics-v13-full-report.json',
    summary: 'docs/auto-execute/evidence/frontend-page/visual/v13-full-report/summary-v13-full-report.json',
    limitation: 'T25 creates deterministic structural visual evidence for V143 C10. V143-18 remains responsible for raster screenshot diff and pixel comparison.'
  });
});
