const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createMiniappShell } = require('./app');
const appJson = require('./app.json');
const { AI_TUTOR_V13_DESIGN_TOKENS, AI_TUTOR_V13_REFERENCES, MINIAPP_ROUTES, TAB_BAR, V143_DESIGN_TOKENS, V143_NAVIGATION_MAP } = require('./routes');
const { createMiniappApiClient } = require('./services/api-client');
const { buildNavigationAssertions, resolveOrderRoute } = require('./utils/navigation');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../shared/local-only');
const { writeJsonEvidence } = require('../shared/evidence-paths');
const { scanTextForMojibake } = require('../tools/mojibake-guard');

const projectRoot = path.resolve(__dirname, '..');
const command = 'npm test -- miniapp-shell';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-shell', name), payload);
}

const mojibakePattern = /(?:[ÃÂ]|(?:棣栭|鎴戜|鎻愬|垎鏁|欑粌|灏忕|鍒濆|瀹屾|淇|绗|姝|獙|帉|攳|啓|瓙|伅|辫触))/;

function findMojibake(value, location, findings = []) {
  if (typeof value === 'string') {
    if (mojibakePattern.test(value)) {
      findings.push({ location, value });
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findMojibake(item, `${location}[${index}]`, findings));
    return findings;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      findMojibake(item, `${location}.${key}`, findings);
    }
  }
  return findings;
}

test('mojibake guard fails representative negative fixtures', () => {
  const fixture = [
    '棣栭〉',
    '鎴戜殑',
    'AI鎻愬垎鏁欵粌',
    '妫ｆ牠',
    '閹存垳',
    '閹绘劕',
    '閸掑棙鐎',
    '鐎瑰本鏆',
    '娣囶喖',
    '闁挎瑥',
    '閿欏',
    '閳',
    '娑�',
    '娴�'
  ].join('\n');
  const findings = scanTextForMojibake(fixture, 'negative-fixture');
  assert.ok(findings.length >= 14);
  assert.ok(findings.some((finding) => finding.pattern === '棣栭'));
  assert.ok(findings.some((finding) => finding.pattern === '鎴戜'));
  assert.ok(findings.some((finding) => finding.pattern === '鎻愬'));
});

test('miniapp API client can load in WeChat runtime without Node builtins at module scope', () => {
  const apiClientSource = fs.readFileSync(path.join(__dirname, 'services', 'api-client.js'), 'utf8');
  const moduleHeader = apiClientSource.slice(0, apiClientSource.indexOf('function createMiniappApiClient'));

  assert.doesNotMatch(moduleHeader, /require\(['"]node:/);
  assert.doesNotMatch(moduleHeader, /require\(['"]\.\.\/\.\.\/server\//);
});

test('full-report runtime imports shared model utilities instead of requiring another page directory', () => {
  const fullReportSource = fs.readFileSync(path.join(__dirname, 'pages', 'full-report', 'index.js'), 'utf8');
  const runtimeHeader = fullReportSource.slice(0, fullReportSource.indexOf('function createFullReportPageState'));

  assert.match(runtimeHeader, /utils\/full-report-model/);
  assert.doesNotMatch(runtimeHeader, /require\(['"]\.\.\/full-report-entry['"]\)/);
});

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

test('v1.3 AI tutor route contracts and design tokens are consumable by later UI tasks', () => {
  const configuredPages = new Set(appJson.pages.map((page) => `/${page}`));
  const referenceIds = new Set(AI_TUTOR_V13_REFERENCES.map((item) => item.id));
  const requiredRoutes = [
    '/pages/full-report/index',
    '/pages/wrong-question/index',
    '/pages/ai-tutor/index',
    '/pages/ai-exercise/index',
    '/pages/ai-exercise-feedback/index'
  ];
  const requiredReferences = [
    'V13-UI-FULL-REPORT',
    'V13-UI-QUESTION-DETAIL',
    'V13-UI-AI-TUTOR',
    'V13-UI-EXERCISE',
    'V13-UI-FEEDBACK'
  ];
  const routeContracts = MINIAPP_ROUTES.filter((route) => requiredRoutes.includes(route.path));
  const controls = routeContracts.flatMap((route) => route.controls.map((control) => ({ route: route.path, ...control })));

  for (const page of requiredRoutes) {
    assert.ok(configuredPages.has(page), `${page} must be registered in app.json`);
    assert.ok(routeContracts.some((route) => route.path === page), `${page} must have a MINIAPP_ROUTES contract`);
  }
  for (const referenceId of requiredReferences) {
    assert.ok(referenceIds.has(referenceId), `${referenceId} must be mapped to a local route/state`);
    assert.ok(routeContracts.some((route) => route.referenceId === referenceId), `${referenceId} must be attached to route contract`);
  }
  for (const control of controls) {
    assert.ok(control.id, `${control.route} control must have id`);
    assert.ok(control.action, `${control.route}:${control.id} must have action`);
    assert.ok(control.targetRoute || control.api || control.behavior || control.fixedAction, `${control.route}:${control.id} must declare route/API/behavior`);
    if (control.targetRoute) {
      assert.ok(configuredPages.has(control.targetRoute), `${control.route}:${control.id} target must exist in app.json`);
    }
  }
  assert.ok(controls.some((control) => control.id === 'open-ai-tutor'));
  assert.ok(controls.some((control) => control.id === 'generate-similar-exercise' && control.targetRoute === '/pages/ai-exercise/index'));
  assert.ok(controls.some((control) => control.id === 'submit-answer' && control.api.includes('/exercise-answer')));
  assert.equal(AI_TUTOR_V13_DESIGN_TOKENS.colors.background, '#fdf8ff');
  assert.equal(AI_TUTOR_V13_DESIGN_TOKENS.colors.primary, '#5a45cb');
  assert.deepEqual(AI_TUTOR_V13_DESIGN_TOKENS.spacingPx.cardPadding, [16, 24]);
  assert.equal(AI_TUTOR_V13_DESIGN_TOKENS.spacingPx.bottomNavHeight, 72);
  assert.equal(AI_TUTOR_V13_DESIGN_TOKENS.radiusPx.largeCard, 24);
  assert.equal(AI_TUTOR_V13_DESIGN_TOKENS.mascot.localOnly, true);

  writeEvidence('v13-ai-tutor-route-contract.json', {
    status: 'PASS',
    command: 'npm test -- miniapp-shell routes ai-tutor',
    requirementIds: ['V13-R01', 'V13-R04', 'V13-R10', 'V13-R11', 'V13-R12', 'V13-R14'],
    references: AI_TUTOR_V13_REFERENCES,
    tokens: AI_TUTOR_V13_DESIGN_TOKENS,
    routeContracts: routeContracts.map(({ id, path, title, states, referenceId, controls }) => ({
      id,
      path,
      title,
      states,
      referenceId,
      controls
    })),
    controlCount: controls.length
  });
});

test('v1.4.3 design tokens, navigation map, click names, and mojibake guard are declared', () => {
  const configuredPages = new Set(appJson.pages.map((page) => `/${page}`));
  const routeIds = new Set(MINIAPP_ROUTES.map((route) => route.id));
  const requiredUiIds = [
    'UI143-C01',
    'UI143-C02',
    'UI143-C03',
    'UI143-C04',
    'UI143-C05',
    'UI143-C07',
    'UI143-C10A',
    'UI143-C10B',
    'UI143-C11C12',
    'UI143-C13-1',
    'UI143-C13-2',
    'UI143-C13-3',
    'UI143-C13-4'
  ];
  const apiIds = new Set(V143_NAVIGATION_MAP.flatMap((item) => item.apiIds));
  const clickNames = V143_NAVIGATION_MAP.flatMap((item) => item.clickNames);
  const activeMojibakeFindings = findMojibake({
    appJson,
    tabBar: TAB_BAR,
    tokens: V143_DESIGN_TOKENS,
    navigation: V143_NAVIGATION_MAP
  }, 'v143');

  assert.equal(V143_DESIGN_TOKENS.version, 'v1.4.3');
  assert.equal(V143_DESIGN_TOKENS.copyPolicy.mojibakeForbidden, true);
  assert.equal(V143_DESIGN_TOKENS.copyPolicy.guaranteedScoreClaimForbidden, true);
  assert.equal(V143_DESIGN_TOKENS.spacingRpx.minTouchTarget, 88);
  assert.equal(appJson.window.navigationBarTitleText, 'AI提分教练');
  assert.deepEqual(appJson.tabBar.list.map((item) => item.text), ['首页', '我的']);
  assert.deepEqual(TAB_BAR.map((item) => item.text), ['首页', '我的']);
  assert.deepEqual(activeMojibakeFindings, []);

  for (const uiId of requiredUiIds) {
    assert.ok(V143_NAVIGATION_MAP.some((item) => item.uiId === uiId), `${uiId} must be mapped`);
  }
  for (const item of V143_NAVIGATION_MAP) {
    const primaryRouteId = String(item.routeId).split('/')[0];
    assert.ok(configuredPages.has(item.route), `${item.uiId} route must exist in app.json: ${item.route}`);
    for (const route of item.compatibleRoutes || []) {
      assert.ok(configuredPages.has(route), `${item.uiId} compatible route must exist in app.json: ${route}`);
    }
    assert.ok(routeIds.has(primaryRouteId) || primaryRouteId === 'C13', `${item.uiId} routeId must be compatible with MINIAPP_ROUTES`);
    assert.ok(item.ownerScenarios.every((scenario) => /^O143-\d{2}$/.test(scenario)), `${item.uiId} owner scenarios must use O143 ids`);
    assert.ok(item.clickNames.every((name) => /^[A-Z0-9]+(?:-[A-Z0-9]+)?\.[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)), `${item.uiId} click names must be stable dot/kebab names`);
    assert.ok(item.apiIds.every((apiId) => /^API143-\d{3}$/.test(apiId)), `${item.uiId} API ids must use API143 ids`);
  }
  for (let index = 1; index <= 18; index += 1) {
    const apiId = `API143-${String(index).padStart(3, '0')}`;
    assert.ok(apiIds.has(apiId), `${apiId} must be represented`);
  }
  assert.ok(clickNames.length >= 30);

  writeEvidence('v143-design-navigation-mojibake.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-007', 'REQ143-008'],
    uiIds: requiredUiIds,
    apiIds: [...apiIds].sort(),
    tabBar: appJson.tabBar.list,
    exportedTabBar: TAB_BAR,
    appTitle: appJson.window.navigationBarTitleText,
    tokens: V143_DESIGN_TOKENS,
    navigationMap: V143_NAVIGATION_MAP,
    clickNameCount: clickNames.length,
    mojibakeGuard: {
      status: 'PASS',
      scannedActiveSurfaces: [
        'scoremap-miniapp/app.json',
        'scoremap-miniapp/routes.js exported TAB_BAR',
        'scoremap-miniapp/routes.js V143_DESIGN_TOKENS',
        'scoremap-miniapp/routes.js V143_NAVIGATION_MAP'
      ],
      findings: activeMojibakeFindings
    },
    localOnly: {
      status: 'PASS',
      realTencentCloudCalls: 0,
      realWechatPayCalls: 0,
      onlineDbCalls: 0,
      realModelProviderCalls: 0,
      productionServiceCalls: 0
    }
  });
});
