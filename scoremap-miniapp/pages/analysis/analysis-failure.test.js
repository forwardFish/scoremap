const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const {
  DEFAULT_FORBIDDEN_PATTERNS,
  assertLocalOnlyEnvironment,
  scanTextForForbiddenRemoteCalls
} = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createAnalysisPageState } = require('./index');
const { createFailurePageState } = require('../failure');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- analysis-failure';
const requirementIds = ['REQ143-007', 'REQ143-008'];
const apiIds = ['API143-003', 'API143-004', 'API143-017'];
const uiIds = ['UI143-C03', 'UI143-C04'];
const ownerScenarioIds = ['O143-01', 'O143-12'];

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

function seedAnalysisTask(client, overrides = {}) {
  const orderId = overrides.orderId || 'order-v143-10-analysis';
  const taskId = overrides.taskId || 'task-v143-10-analysis';

  client.store.upsert('diagnosis_orders', {
    id: orderId,
    ownerId: 'local-user-scoremap-v143-10',
    status: overrides.status || 'analyzing',
    accessLevel: 'preview',
    source: 'V143-10-analysis-failure'
  });
  client.store.upsert('ai_analysis_tasks', {
    id: taskId,
    orderId,
    ownerId: 'local-user-scoremap-v143-10',
    type: 'preview',
    status: overrides.status || 'analyzing',
    progress: overrides.progress ?? 68,
    currentStep: overrides.currentStep || 'locate-loss-points',
    errorCode: overrides.errorCode || null,
    retryCount: overrides.retryCount || 0
  });

  return { orderId, taskId };
}

test('C03 analysis page renders progress controls, two-second polling, manual refresh, later view, and review/full completion', () => {
  const client = createMiniappApiClient();
  const { orderId, taskId } = seedAnalysisTask(client);
  const page = createAnalysisPageState(client, { orderId });

  const initial = page.getState();
  const pending = page.pollProgress(2000);
  const refresh = page.refreshProgress();
  const later = page.laterView();

  client.store.upsert('ai_analysis_tasks', {
    ...client.store.read('ai_analysis_tasks', taskId),
    status: 'review_done',
    progress: 100,
    currentStep: 'preview_ready'
  });
  client.store.upsert('diagnosis_decisions', {
    id: `decision-${orderId}-preview`,
    orderId,
    ownerId: 'local-user-scoremap-v143-10',
    level: 'preview',
    preview: { visibleModules: ['overview', 'loss-points', 'advice'], lockedModules: ['full-report'] }
  });
  client.store.upsert('diagnosis_orders', {
    ...client.store.read('diagnosis_orders', orderId),
    status: 'review_done'
  });
  const complete = page.pollProgress(4000);

  client.store.upsert('ai_analysis_tasks', {
    ...client.store.read('ai_analysis_tasks', taskId),
    status: 'full_done',
    progress: 100,
    currentStep: 'full_report_ready'
  });
  client.store.upsert('diagnosis_orders', {
    ...client.store.read('diagnosis_orders', orderId),
    status: 'full_done',
    accessLevel: 'full'
  });
  const fullComplete = page.pollProgress(6000);

  assert.equal(initial.route, '/pages/analysis/index');
  assert.equal(initial.uiReference.id, 'UI143-C03');
  assert.equal(initial.pollIntervalMs, 2000);
  assert.equal(initial.timeoutMs, 30000);
  assert.deepEqual(initial.controls.map((control) => control.id), ['later-view', 'refresh-progress']);
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.nextPollInMs, 2000);
  assert.equal(refresh.status, 'PENDING');
  assert.equal(later.targetRoute, '/pages/reports/index');
  assert.equal(complete.status, 'READY');
  assert.equal(complete.targetRoute, '/pages/preview/index');
  assert.equal(fullComplete.status, 'FULL_READY');
  assert.equal(fullComplete.targetRoute, '/pages/full-report/index');

  writeEvidence('analysis-page-route-controls.json', {
    status: 'PASS',
    taskId: 'V143-10',
    command,
    requirementIds,
    apiIds: ['API143-004', 'API143-017'],
    uiIds: ['UI143-C03'],
    ownerScenarioIds: ['O143-01'],
    route: initial.route,
    uiReference: initial.uiReference,
    renderedState: page.getState(),
    pageJumpEvidence: [
      { controlId: 'refresh-progress', result: refresh },
      { controlId: 'later-view', result: later },
      { event: 'auto-review-done', result: complete },
      { event: 'auto-full-done', result: fullComplete }
    ],
    apiCalls: client.calls
  });
});

test('C03/C04 records local API calls, DB readbacks, timeout, failure, retry, reupload, and home recovery', () => {
  const client = createMiniappApiClient();
  const { orderId, taskId } = seedAnalysisTask(client, {
    orderId: 'order-v143-10-failure',
    taskId: 'task-v143-10-failure',
    status: 'preview_failed',
    progress: 0,
    errorCode: 'blurry_material'
  });
  const analysis = createAnalysisPageState(client, { orderId });
  const failureJump = analysis.refreshProgress();

  const timeoutClient = createMiniappApiClient();
  const { orderId: timeoutOrderId } = seedAnalysisTask(timeoutClient, {
    orderId: 'order-v143-10-timeout',
    taskId: 'task-v143-10-timeout',
    status: 'analyzing',
    progress: 72
  });
  const timeoutPage = createAnalysisPageState(timeoutClient, { orderId: timeoutOrderId });
  const timeout = timeoutPage.pollProgress(30000);

  const failure = createFailurePageState(client, { orderId, errorCode: 'blurry_material' });
  const failureInitial = failure.getState();
  const retry = failure.retryAnalysis();
  const reupload = failure.reupload();
  const home = failure.backHome();
  const retryTaskId = `task-v143-10-retry-${orderId}`;
  const snapshot = client.store.snapshot();

  assert.equal(failureInitial.uiReference.id, 'UI143-C04');
  assert.equal(failureJump.status, 'FAILED');
  assert.equal(failureJump.targetRoute, '/pages/failure/index');
  assert.equal(timeout.status, 'TIMEOUT');
  assert.equal(timeout.targetRoute, '/pages/failure/index');
  assert.equal(retry.status, 'RETRY_STARTED');
  assert.equal(retry.targetRoute, '/pages/analysis/index');
  assert.equal(reupload.targetRoute, '/pages/index/index');
  assert.equal(home.targetRoute, '/pages/index/index');
  assert.equal(client.store.read('ai_analysis_tasks', retryTaskId).retryCount, 1);
  assert.equal(client.store.read('diagnosis_orders', orderId).status, 'analyzing');

  writeEvidence('analysis-failure-api-db.json', {
    status: 'PASS',
    taskId: 'V143-10',
    command,
    requirementIds,
    apiIds: ['API143-003', 'API143-004'],
    uiIds,
    ownerScenarioIds,
    apiEvidence: {
      failureProgressCall: client.calls.find((call) => call.path.endsWith('/analysis-progress')),
      retryCall: client.calls.find((call) => call.path.endsWith('/start-preview-analysis')),
      timeoutCall: timeoutClient.calls.find((call) => call.path.endsWith('/analysis-progress'))
    },
    pageJumpEvidence: [
      { event: 'failed-progress', result: failureJump },
      { event: 'timeout-progress', result: timeout },
      { controlId: 'retry-analysis', result: retry },
      { controlId: 'reupload', result: reupload },
      { controlId: 'back-home', result: home }
    ],
    dbReadback: {
      failedOrder: client.store.read('diagnosis_orders', orderId),
      failedTask: client.store.read('ai_analysis_tasks', taskId),
      retryTask: client.store.read('ai_analysis_tasks', retryTaskId),
      allAnalysisTasks: snapshot.ai_analysis_tasks
    }
  });
});

test('V143-10 C03/C04 local-only guard evidence has no remote provider/service calls', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/analysis/index.js',
    'scoremap-miniapp/pages/analysis/analysis-failure.test.js',
    'scoremap-miniapp/pages/analysis/visual-analysis-failure.js',
    'scoremap-miniapp/pages/failure/index.js',
    'scoremap-miniapp/services/api-client.js',
    'scoremap-miniapp/services/local-fixture-store.js'
  ];
  const forbiddenRemoteFindings = [];

  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      forbiddenRemoteFindings.push({ path: relativePath, match });
    }
  }

  assert.deepEqual(forbiddenRemoteFindings, []);
  writeEvidence('analysis-failure-owner-local.json', {
    status: 'PASS_WITH_LIMITATION',
    taskId: 'V143-10',
    command,
    requirementIds,
    apiIds,
    uiIds,
    ownerScenarioIds,
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      clickPath: [
        '/pages/analysis/index',
        'refresh-progress',
        '/pages/failure/index',
        'retry-analysis',
        '/pages/analysis/index',
        '/pages/failure/index',
        'reupload',
        '/pages/index/index'
      ],
      apiEvidence: 'docs/auto-execute/evidence/frontend-page/analysis-failure-api-db.json',
      dbEvidence: 'docs/auto-execute/evidence/frontend-page/analysis-failure-api-db.json',
      limitation: 'V143-10 records deterministic C03/C04 owner actions locally; full WeChat simulator/device UI acceptance is not claimed.'
    },
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      references: ['docs/UI/小程序/03-AI分析中.png', 'docs/UI/小程序/08-处理失败.png'],
      expectedVisualCommand: 'npm run visual:scoremap -- analysis failure',
      limitation: 'The local visual runner provides structural/raster evidence. Manual UI review or later final visual acceptance remains required before full PASS.'
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
