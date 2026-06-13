const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFullReportEntryPageState } = require('../full-report-entry');
const { createFullReportPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- full-report-pdf';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

function absoluteEvidencePath(relativePath) {
  return path.join(projectRoot, relativePath);
}

test('full report entry renders C09 generated status, content list, save, home, and report jump controls', () => {
  const client = createMiniappApiClient();
  const page = createFullReportEntryPageState(client, { orderId: 'order-t11-entry' });
  const load = page.loadFullReport();
  const state = page.getState();
  const view = page.viewFullReport();
  const save = page.saveReport();
  const home = page.backHome();

  assert.equal(state.route, '/pages/full-report-entry/index');
  assert.equal(load.status, 'FULL_REPORT_READY');
  assert.equal(load.apiStatus, 200);
  assert.equal(state.generatedStatus, 'full_report_ready');
  assert.equal(state.contentList.length, 4);
  assert.deepEqual(state.contentList.map((item) => item.id), [
    'knowledge-diagnosis',
    'loss-point-breakdown',
    'seven-day-plan',
    'parent-guidance'
  ]);
  assert.equal(view.targetRoute, '/pages/full-report/index');
  assert.equal(save.status, 'SAVED');
  assert.equal(save.dbReadback.savedReport, true);
  assert.equal(home.targetRoute, '/pages/index/index');
  assert.ok(client.calls.some((call) => call.method === 'GET' && call.path === '/api/diagnosis-orders/order-t11-entry/full-report'));
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/reports/order-t11-entry/save'));

  writeEvidence('full-report-pdf-route-controls.json', {
    status: 'PASS',
    command,
    requirementIds: ['R09'],
    ownerScenarioIds: ['O04', 'O05'],
    uiReferences: ['UI-C09'],
    route: state.route,
    renderedState: state,
    pageJumpEvidence: [
      { controlId: 'load-full-report', result: load },
      { controlId: 'view-full-report', result: view },
      { controlId: 'save-report', result: save },
      { controlId: 'back-home', result: home }
    ],
    apiCalls: client.calls
  });
});

test('PDF-style full report loads, saves, exports a real local PDF file, and hides the PDF entry until ready', () => {
  const client = createMiniappApiClient();
  createFullReportEntryPageState(client, { orderId: 'order-t11-pdf' }).loadFullReport();
  const page = createFullReportPageState(client, { orderId: 'order-t11-pdf' });
  const load = page.loadFullReport();
  const state = page.getState();
  const tab = page.switchTab('7天计划');
  const save = page.saveReport();
  const pdfHiddenBeforeExport = state.controls.find((control) => control.id === 'pdf-export-entry');
  const pdf = page.exportPdf();
  const stateAfterExport = page.getState();
  const pdfReadyEntry = stateAfterExport.controls.find((control) => control.id === 'pdf-export-entry');
  const back = page.returnEntry();
  const snapshot = client.store.snapshot();

  assert.equal(state.route, '/pages/full-report/index');
  assert.equal(load.status, 'FULL_REPORT_READY');
  assert.equal(state.paper.modules.length, 4);
  assert.equal(state.paper.fiveCoreCards.length, 5);
  assert.equal(state.controls.find((control) => control.id === 'export-pdf').visible, false);
  assert.equal(pdfHiddenBeforeExport.visible, false);
  assert.equal(tab.status, 'TAB_CHANGED');
  assert.equal(tab.activeTab, '7天计划');
  assert.equal(save.status, 'SAVED');
  assert.equal(pdf.status, 'PDF_READY');
  assert.equal(pdfReadyEntry.visible, true);
  assert.equal(pdfReadyEntry.status, 'ready');
  assert.equal(pdf.dbReadback.format, 'application/pdf');
  assert.ok(pdf.dbReadback.byteLength > 100);
  assert.ok(fs.existsSync(absoluteEvidencePath(pdf.filePath)));
  assert.equal(fs.readFileSync(absoluteEvidencePath(pdf.filePath), 'utf8').slice(0, 8), '%PDF-1.4');
  assert.equal(back.targetRoute, '/pages/full-report-entry/index');
  assert.ok(client.calls.some((call) => call.method === 'POST' && call.path === '/api/diagnosis-orders/order-t11-pdf/export-pdf'));

  writeEvidence('full-report-pdf-api-db.json', {
    status: 'PASS',
    command,
    requirementIds: ['R09', 'R15'],
    ownerScenarioIds: ['O05'],
    apiEvidence: {
      fullReport: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-t11-pdf/full-report'),
      saveReport: client.calls.find((call) => call.path === '/api/reports/order-t11-pdf/save'),
      exportPdf: client.calls.find((call) => call.path === '/api/diagnosis-orders/order-t11-pdf/export-pdf')
    },
    pageJumpEvidence: [
      { controlId: 'switch-tab-7-day-plan', result: tab },
      { controlId: 'save-report', result: save },
      { controlId: 'pdf-entry-hidden-before-export', result: pdfHiddenBeforeExport },
      { controlId: 'export-pdf-hidden-action', result: pdf },
      { controlId: 'pdf-entry-visible-after-export', result: pdfReadyEntry },
      { controlId: 'return-entry', result: back }
    ],
    dbReadback: {
      order: client.store.read('diagnosis_orders', 'order-t11-pdf'),
      fullDecision: client.store.read('diagnosis_decisions', 'decision-order-t11-pdf-full'),
      reportExport: pdf.dbReadback,
      snapshot
    },
    localPdf: {
      path: pdf.filePath,
      exists: fs.existsSync(absoluteEvidencePath(pdf.filePath)),
      header: fs.readFileSync(absoluteEvidencePath(pdf.filePath), 'utf8').slice(0, 8)
    }
  });
});

test('full-report-pdf records owner limitation, visual limitation, and local-only guard evidence', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/full-report-entry/index.js',
    'scoremap-miniapp/pages/full-report/index.js',
    'scoremap-miniapp/pages/full-report/full-report-pdf.test.js',
    'scoremap-miniapp/pages/full-report/visual-full-report-pdf.js',
    'scoremap-miniapp/services/api-client.js',
    'server/src/report/local-pdf.js'
  ];
  const forbiddenRemoteFindings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }
  assert.deepEqual(forbiddenRemoteFindings, []);
  writeEvidence('full-report-pdf-owner-local.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    requirementIds: ['R09', 'R15'],
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      scenarios: ['O04', 'O05'],
      clickPath: [
        '/pages/full-report-entry/index',
        'view-full-report',
        '/pages/full-report/index',
        'save-report',
        'export-pdf',
        'return-entry'
      ],
      apiEvidence: 'docs/auto-execute/evidence/frontend-page/full-report-pdf-api-db.json',
      dbEvidence: 'docs/auto-execute/evidence/frontend-page/full-report-pdf-api-db.json',
      limitation: 'T11 records deterministic C09/C10 owner actions. Full rendered O01-O12 owner E2E remains assigned to T15.'
    },
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      references: [
        'ui-reference-catalog/小程序/完整提分报告.png',
        'ui-reference-catalog/小程序/完整提分报告.png',
        'ui-reference-catalog/小程序/stitch_codex_development_blueprints/_2/screen-reference',
        'ui-reference-catalog/小程序/stitch_codex_development_blueprints/ai_pdf/screen-reference'
      ],
      expectedVisualCommand: 'npm run visual:scoremap -- full-report-entry full-report',
      limitation: 'T11 visual runner produces deterministic structural artifacts and metrics. Pixel-perfect screenshot capture remains assigned to T14.'
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
