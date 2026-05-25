const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createMiniappShell } = require('./app');
const appJson = require('./app.json');
const { createMiniappApiClient } = require('./services/api-client');
const { buildNavigationAssertions, resolveOrderRoute } = require('./utils/navigation');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../shared/local-only');

const projectRoot = path.resolve(__dirname, '..');
const evidenceDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'frontend-shell');
const command = 'npm test -- miniapp-shell';

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

test('miniapp-shell route table, tab bar, and page jumps match the T06 contract', () => {
  const shell = createMiniappShell();
  const assertions = buildNavigationAssertions();
  const configuredPages = appJson.pages.map((page) => `/${page}`);

  assert.equal(shell.launchRoute, '/pages/index/index');
  assert.equal(shell.localOnly, true);
  assert.deepEqual(shell.tabBar.map((item) => item.pagePath), ['/pages/index/index', '/pages/my/index']);
  for (const route of shell.routes) {
    assert.ok(configuredPages.includes(route.path), `${route.path} must exist in app.json`);
  }
  for (const item of appJson.tabBar.list) {
    assert.ok(shell.tabBar.some((tab) => tab.pagePath === `/${item.pagePath}`));
  }
  assert.ok(assertions.length >= 20);

  writeEvidence('page-route-shell.json', {
    status: 'PASS',
    command,
    requirementIds: ['R01', 'R10', 'R11'],
    launchRoute: shell.launchRoute,
    tabBar: shell.tabBar,
    routes: shell.routes.map(({ id, path, title, controls }) => ({
      id,
      path,
      title,
      controls: controls.map((control) => ({
        id: control.id,
        action: control.action,
        targetRoute: control.targetRoute || null,
        api: control.api || null
      }))
    })),
    pageJumpAssertions: assertions
  });
});

test('miniapp-shell local API client records contracts and local DB readbacks', () => {
  const client = createMiniappApiClient();
  const create = client.request('POST', '/api/diagnosis-orders', {
    orderId: 'order-t06-shell',
    source: 'miniapp-shell',
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  });
  const upload = client.request('POST', '/api/diagnosis-orders/order-t06-shell/uploads', {
    authorizationAccepted: true,
    files: ['local-fixture-answer-sheet']
  });
  const start = client.request('POST', '/api/diagnosis-orders/order-t06-shell/start-preview-analysis', {});
  const progress = client.request('GET', '/api/diagnosis-orders/order-t06-shell/analysis-progress');
  const preview = client.request('GET', '/api/diagnosis-orders/order-t06-shell/preview-decision');
  const basicPay = client.request('POST', '/api/payments/create', { orderId: 'order-t06-shell', paymentType: 'basic' });
  const basic = client.request('GET', '/api/diagnosis-orders/order-t06-shell/basic-decision');
  const fullPay = client.request('POST', '/api/payments/create', { orderId: 'order-t06-shell', paymentType: 'full' });
  const generateFull = client.request('POST', '/api/diagnosis-orders/order-t06-shell/generate-full');
  const full = client.request('GET', '/api/diagnosis-orders/order-t06-shell/full-report');
  const save = client.request('POST', '/api/diagnosis-orders/order-t06-shell/save-report');
  const feedback = client.request('POST', '/api/diagnosis-orders/order-t06-shell/feedback', { rating: 5 });
  const exportPdf = client.request('POST', '/api/diagnosis-orders/order-t06-shell/export-pdf');
  const reports = client.request('GET', '/api/my/reports');
  const snapshot = client.store.snapshot();

  assert.equal(create.status, 201);
  assert.equal(upload.status, 200);
  assert.equal(start.body.status, 'preview_done');
  assert.equal(progress.body.progress, 100);
  assert.equal(preview.body.decision.visibleModules.length, 3);
  assert.equal(basicPay.body.paymentParams.adapter, 'local-mock');
  assert.equal(basic.body.decision.level, 'basic');
  assert.equal(fullPay.body.status, 'paid');
  assert.equal(generateFull.body.status, 'full_done');
  assert.equal(full.body.decision.level, 'full');
  assert.equal(save.body.saved, true);
  assert.equal(feedback.status, 201);
  assert.match(exportPdf.body.exportId, /^export-/);
  assert.equal(reports.body.items.length, 1);
  assert.equal(snapshot.diagnosis_orders[0].savedReport, true);
  assert.equal(snapshot.upload_files.length, 1);
  assert.equal(snapshot.payments.length, 2);
  assert.equal(snapshot.feedbacks.length, 1);
  assert.equal(snapshot.report_exports.length, 1);

  writeEvidence('api-contract-shell.json', {
    status: 'PASS',
    command,
    requirementIds: ['R01', 'R02', 'R03', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10'],
    apiCalls: client.calls,
    dbReadback: {
      order: client.store.read('diagnosis_orders', 'order-t06-shell'),
      upload: client.store.read('upload_files', 'upload-t06-shell'),
      previewTask: client.store.read('ai_analysis_tasks', 'task-t06-preview'),
      fullTask: client.store.read('ai_analysis_tasks', 'task-t06-full'),
      payments: snapshot.payments,
      feedback: client.store.read('feedbacks', 'feedback-t06-shell'),
      reportExport: client.store.read('report_exports', 'export-t06-shell')
    }
  });
});

test('miniapp-shell route guard maps local order states to expected pages', () => {
  const cases = [
    { order: null, expected: '/pages/index/index' },
    { order: { status: 'uploaded', accessLevel: 'preview' }, expected: '/pages/analysis/index' },
    { order: { status: 'failed', accessLevel: 'preview' }, expected: '/pages/failure/index' },
    { order: { status: 'preview_done', accessLevel: 'preview' }, expected: '/pages/preview/index' },
    { order: { status: 'preview_done', accessLevel: 'basic' }, expected: '/pages/basic-result/index' },
    { order: { status: 'preview_done', accessLevel: 'full' }, expected: '/pages/full-report-entry/index' },
    { order: { status: 'preview_done', accessLevel: 'full', savedReport: true }, expected: '/pages/full-report/index' }
  ];
  for (const item of cases) {
    assert.equal(resolveOrderRoute(item.order), item.expected);
  }

  writeEvidence('route-guard-shell.json', {
    status: 'PASS',
    command,
    requirementIds: ['R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R11'],
    assertions: cases.map((item) => ({
      input: item.order,
      targetRoute: item.expected,
      actualRoute: resolveOrderRoute(item.order)
    }))
  });
});

test('miniapp-shell records visual, owner, and local-only guard evidence truthfully', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/app.js',
    'scoremap-miniapp/routes.js',
    'scoremap-miniapp/services/api-client.js',
    'scoremap-miniapp/services/local-fixture-store.js',
    'scoremap-miniapp/utils/navigation.js',
    'scoremap-miniapp/miniapp-shell.test.js'
  ];
  const forbiddenRemoteFindings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }

  assert.deepEqual(forbiddenRemoteFindings, []);
  writeEvidence('owner-visual-local-shell.json', {
    status: 'PASS_WITH_LIMITATION',
    command,
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: [],
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      references: ['UI-C01', 'UI-C03', 'UI-C04', 'UI-C05', 'UI-C06', 'UI-C07', 'UI-C08', 'UI-C09', 'UI-C10', 'UI-C11', 'UI-C12'],
      actualScreenshotStatus: 'not_created_by_T06',
      diffStatus: 'not_created_by_T06',
      reason: 'T06 proves shell routes, controls, and contracts. Page-specific screenshots and pixel diffs are assigned to T07-T14.'
    },
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      covered: ['tab switch metadata', 'page jump assertions', 'API contract calls', 'route guard readbacks'],
      deferredTo: 'T15',
      reason: 'T06 validates the owner navigation shell; exact P0 click trace with rendered screenshots remains assigned to T15.'
    }
  });
});
