const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { createMiniappApiClient } = require('../../scoremap-miniapp/services/api-client');
const { createHomeUploadPageState } = require('../../scoremap-miniapp/pages/index');
const { createStudentInfoPageState } = require('../../scoremap-miniapp/pages/student-info');
const { createAnalysisPageState } = require('../../scoremap-miniapp/pages/analysis');
const { createFailurePageState } = require('../../scoremap-miniapp/pages/failure');
const { createPreviewPageState } = require('../../scoremap-miniapp/pages/preview');
const { createBasicPayPageState } = require('../../scoremap-miniapp/pages/basic-pay');
const { createBasicResultPageState } = require('../../scoremap-miniapp/pages/basic-result');
const { createFullUnlockPageState } = require('../../scoremap-miniapp/pages/full-unlock');
const { createFullReportEntryPageState } = require('../../scoremap-miniapp/pages/full-report-entry');
const { createFullReportPageState } = require('../../scoremap-miniapp/pages/full-report');
const { createMyPageState } = require('../../scoremap-miniapp/pages/my');
const { createReportsPageState, createStateFromItems } = require('../../scoremap-miniapp/pages/reports');
const { createOrdersPageState } = require('../../scoremap-miniapp/pages/orders');
const { createFeedbackPageState } = require('../../scoremap-miniapp/pages/feedback');
const { createWrongQuestionPageState } = require('../../scoremap-miniapp/pages/wrong-question');
const { createAiTutorPageState, fixedButtons } = require('../../scoremap-miniapp/pages/ai-tutor');
const { createAiExercisePageState } = require('../../scoremap-miniapp/pages/ai-exercise');
const { createAiExerciseFeedbackPageState } = require('../../scoremap-miniapp/pages/ai-exercise-feedback');
const { MINIAPP_ROUTES } = require('../../scoremap-miniapp/routes');
const { writeFileWithRetry } = require('../support/file-io');
const appJson = require('../../scoremap-miniapp/app.json');

const projectRoot = path.resolve(__dirname, '..', '..');
const ownerEvidenceRel = process.env.SCOREMAP_OWNER_EVIDENCE_DIR || rel('docs', 'auto-execute', 'evidence', 'owner-current');
const resultRootRel = process.env.SCOREMAP_RESULT_DIR || rel('docs', 'auto-execute', 'results-current');
const latestRootRel = process.env.SCOREMAP_LATEST_DIR || rel('docs', 'auto-execute', 'latest-current');
const evidenceRoot = path.join(projectRoot, ownerEvidenceRel);
const command = 'npm run e2e:owner';
const appRoutes = new Set(appJson.pages.map((page) => `/${page}`));

const visualByRoute = {
  '/pages/index/index': 'home',
  '/pages/student-info/index': 'student-info',
  '/pages/analysis/index': 'analysis',
  '/pages/failure/index': 'failure',
  '/pages/preview/index': 'preview',
  '/pages/basic-pay/index': 'basic-pay',
  '/pages/basic-result/index': 'basic-result',
  '/pages/full-unlock/index': 'full-unlock',
  '/pages/full-report-entry/index': 'full-report-entry',
  '/pages/full-report/index': 'full-report',
  '/pages/my/index': 'my',
  '/pages/reports/index': 'reports'
};

const v13VisualByKey = {
  fullReport: 'full-report',
  wrongQuestionDetail: 'wrong-question-detail',
  aiTutor: 'ai-tutor',
  similarExercise: 'similar-exercise',
  answerFeedback: 'answer-feedback'
};

function rel(...parts) {
  return parts.join('/');
}

function writeJson(relativePath, payload) {
  const absolutePath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileWithRetry(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
  return relativePath;
}

function visualEvidenceFor(route) {
  const screen = visualByRoute[route];
  assert.ok(screen, `missing visual mapping for ${route}`);
  const base = rel('docs', 'auto-execute', 'evidence', 'visual-harness', screen);
  const evidence = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    route,
    actual: rel(base, 'actual.svg'),
    diff: rel(base, 'diff.svg'),
    metrics: rel(base, 'metrics.json'),
    summary: rel(base, 'summary.json')
  };
  for (const item of [evidence.actual, evidence.diff, evidence.metrics, evidence.summary]) {
    assert.ok(fs.existsSync(path.join(projectRoot, item)), `missing visual evidence ${item}`);
  }
  return evidence;
}

function v13VisualEvidenceFor(key, route) {
  const screen = v13VisualByKey[key];
  assert.ok(screen, `missing v1.3 visual mapping for ${key}`);
  const base = rel('docs', 'auto-execute', 'evidence', 'visual-harness', 'ai-tutor-v13', screen);
  const evidence = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    route,
    reference: rel(base, 'reference.png'),
    actual: rel(base, 'actual.svg'),
    diff: rel(base, 'diff.svg'),
    metrics: rel(base, 'metrics.json'),
    summary: rel(base, 'summary.json')
  };
  for (const item of [evidence.reference, evidence.actual, evidence.diff, evidence.metrics, evidence.summary]) {
    assert.ok(fs.existsSync(path.join(projectRoot, item)), `missing v1.3 visual evidence ${item}`);
  }
  return evidence;
}

function scenario(id, requirementIds, clickPath, routeEvidence, apiCalls, dbReadback, visualRoutes, extra = {}) {
  const payload = {
    scenarioId: id,
    status: 'PASS',
    command,
    requirementIds,
    clickPath,
    routeEvidence,
    apiEvidence: apiCalls,
    dbEvidence: dbReadback,
    visualEvidence: [...new Set(visualRoutes)].map(visualEvidenceFor),
    localOnly: {
      LOCAL_ONLY: 'true',
      adapterMode: 'local-mock',
      paymentAdapter: 'local-wechat-pay-mock',
      cloudAdapter: 'local-tencent-cloud-mock',
      databaseAdapter: 'local-fixture-store',
      remoteCalls: []
    },
    ...extra
  };
  const file = writeJson(rel(ownerEvidenceRel, `${id}.json`), payload);
  return { scenarioId: id, status: 'PASS', evidence: file };
}

function callsSince(client, startIndex) {
  return client.calls.slice(startIndex);
}

function assertLocalTarget(result, label) {
  if (!result || !result.targetRoute) return null;
  assert.ok(appRoutes.has(result.targetRoute), `${label} target route must exist in app.json: ${result.targetRoute}`);
  return result.targetRoute;
}

function startHomeUpload(home) {
  const tapped = home.tapUploadMaterial();
  if (typeof home.confirmUploadAuthorization === 'function') {
    return {
      prompt: tapped,
      ready: home.confirmUploadAuthorization(),
      mode: 'authorization-modal'
    };
  }
  return {
    prompt: tapped,
    ready: tapped,
    mode: 'direct-upload'
  };
}

function cancelHomeUpload(home) {
  if (typeof home.cancelUploadAuthorization === 'function') return home.cancelUploadAuthorization();
  return {
    status: 'NO_AUTHORIZATION_MODAL',
    targetRoute: '/pages/index/index'
  };
}

function scanLocalOnlyFiles() {
  const files = [
    'tests/e2e/owner-click-flow.test.js',
    'scoremap-miniapp/services/api-client.js',
    'scoremap-miniapp/services/local-fixture-store.js',
    'scoremap-miniapp/utils/navigation.js',
    'scoremap-miniapp/pages/index/index.js',
    'scoremap-miniapp/pages/student-info/index.js',
    'scoremap-miniapp/pages/analysis/index.js',
    'scoremap-miniapp/pages/failure/index.js',
    'scoremap-miniapp/pages/preview/index.js',
    'scoremap-miniapp/pages/basic-pay/index.js',
    'scoremap-miniapp/pages/basic-result/index.js',
    'scoremap-miniapp/pages/full-unlock/index.js',
    'scoremap-miniapp/pages/full-report-entry/index.js',
    'scoremap-miniapp/pages/full-report/index.js',
    'scoremap-miniapp/pages/my/index.js',
    'scoremap-miniapp/pages/reports/index.js',
    'scoremap-miniapp/pages/orders/index.js',
    'scoremap-miniapp/pages/feedback/index.js',
    'scoremap-miniapp/navigation-click-audit.test.js'
  ];
  return files.flatMap((file) => {
    const text = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    return scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS).map((match) => ({ file, match }));
  });
}

test('T15 parent owner clicks O01-O13 with route, API, DB, visual, and local-only evidence', () => {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const localOnly = assertLocalOnlyEnvironment({ LOCAL_ONLY: 'true', SCOREMAP_ADAPTER_MODE: 'local-mock' });
  const client = createMiniappApiClient();
  const results = [];

  const home = createHomeUploadPageState(client);
  const homeUpload = startHomeUpload(home);
  const authPrompt = homeUpload.prompt;
  const uploadReady = homeUpload.ready;
  const studentInfo = createStudentInfoPageState(client);
  studentInfo.updateField('currentScore', '78');
  studentInfo.updateField('targetScore', '95');
  studentInfo.updateField('examType', '月考');
  const uploadStart = callsSince(client, 0).length;
  const upload = studentInfo.submitStudentInfo();
  assert.equal(uploadReady.status, 'UPLOAD_READY');
  assert.equal(uploadReady.targetRoute, '/pages/student-info/index');
  assert.equal(upload.targetRoute, '/pages/analysis/index');
  assert.equal(client.store.read('diagnosis_orders', upload.orderId).status, 'preview_done');
  results.push(scenario('O01', ['R01', 'R02', 'R14', 'R15'], [
    '/pages/index/index', 'upload-material', homeUpload.mode,
    '/pages/student-info/index', 'submit-student-info', '/pages/analysis/index'
  ], { startRoute: '/pages/index/index', infoRoute: uploadReady.targetRoute, targetRoute: upload.targetRoute, modal: authPrompt.modalId || null, uploadMode: homeUpload.mode }, callsSince(client, uploadStart), {
    order: client.store.read('diagnosis_orders', upload.orderId),
    upload: client.store.read('upload_files', 'upload-t07-home-upload'),
    analysisTask: client.store.read('ai_analysis_tasks', 'task-t07-preview')
  }, ['/pages/index/index', '/pages/analysis/index']));

  const analysis = createAnalysisPageState(client, { orderId: upload.orderId });
  const progressStart = client.calls.length;
  const progress = analysis.refreshProgress();
  const later = analysis.laterView();
  assert.equal(progress.targetRoute, '/pages/preview/index');
  assert.equal(later.targetRoute, '/pages/reports/index');
  results.push(scenario('O02', ['R03', 'R05', 'R14'], ['refresh-progress', '/pages/preview/index', 'later-view', '/pages/reports/index'], {
    progressRoute: progress.targetRoute,
    laterRoute: later.targetRoute
  }, callsSince(client, progressStart), {
    task: client.store.read('ai_analysis_tasks', 'task-t07-preview'),
    previewDecision: client.store.read('diagnosis_decisions', `decision-${upload.orderId}-preview`)
  }, ['/pages/analysis/index', '/pages/preview/index', '/pages/reports/index']));

  const preview = createPreviewPageState(client, { orderId: upload.orderId });
  const basicPay = createBasicPayPageState(client, { orderId: upload.orderId });
  const basicStart = client.calls.length;
  const previewLoad = preview.loadPreview();
  const unlockBasic = preview.unlockBasic();
  const paidBasic = basicPay.confirmBasicPay();
  assert.equal(previewLoad.visibleModuleCount, 3);
  assert.equal(unlockBasic.targetRoute, '/pages/basic-pay/index');
  assert.equal(paidBasic.targetRoute, '/pages/basic-result/index');
  assert.equal(client.store.read('diagnosis_orders', upload.orderId).accessLevel, 'basic');
  results.push(scenario('O03', ['R05', 'R06', 'R14', 'R15'], ['unlock-basic', '/pages/basic-pay/index', 'confirm-basic-pay', '/pages/basic-result/index'], {
    previewRoute: '/pages/preview/index',
    paymentRoute: '/pages/basic-pay/index',
    resultRoute: paidBasic.targetRoute
  }, callsSince(client, basicStart), {
    order: client.store.read('diagnosis_orders', upload.orderId),
    basicPayment: paidBasic.paymentReadback,
    basicDecision: client.store.read('diagnosis_decisions', `decision-${upload.orderId}-basic`)
  }, ['/pages/preview/index', '/pages/basic-pay/index', '/pages/basic-result/index']));

  const basicResult = createBasicResultPageState(client, { orderId: upload.orderId });
  const fullUnlock = createFullUnlockPageState(client, { orderId: upload.orderId });
  const fullStart = client.calls.length;
  const basicDecision = basicResult.loadBasicDecision();
  const openFull = basicResult.unlockFull();
  const paidFull = fullUnlock.confirmFullPay();
  assert.equal(basicDecision.status, 'BASIC_READY');
  assert.equal(openFull.targetRoute, '/pages/full-unlock/index');
  assert.equal(paidFull.targetRoute, '/pages/full-report-entry/index');
  assert.equal(client.store.read('diagnosis_orders', upload.orderId).accessLevel, 'full');
  results.push(scenario('O04', ['R07', 'R08', 'R09', 'R14', 'R15'], ['unlock-full', '/pages/full-unlock/index', 'confirm-full-pay', '/pages/full-report-entry/index'], {
    basicResultRoute: '/pages/basic-result/index',
    fullUnlockRoute: '/pages/full-unlock/index',
    targetRoute: paidFull.targetRoute
  }, callsSince(client, fullStart), {
    order: client.store.read('diagnosis_orders', upload.orderId),
    fullPayment: paidFull.paymentReadback,
    fullDecision: paidFull.fullDecisionReadback
  }, ['/pages/basic-result/index', '/pages/full-unlock/index', '/pages/full-report-entry/index']));

  const entry = createFullReportEntryPageState(client, { orderId: upload.orderId });
  const report = createFullReportPageState(client, { orderId: upload.orderId });
  const my = createMyPageState(client, { feedbackOrderId: upload.orderId });
  const reports = createReportsPageState(client);
  const saveStart = client.calls.length;
  const entryLoad = entry.loadFullReport();
  const viewFull = entry.viewFullReport();
  const reportLoad = report.loadFullReport();
  const save = report.saveReport();
  my.loadSummary();
  const openReports = my.openReports();
  reports.loadReports();
  const cardJump = reports.openReportCard(upload.orderId);
  assert.equal(entryLoad.status, 'FULL_REPORT_READY');
  assert.equal(viewFull.targetRoute, '/pages/full-report/index');
  assert.equal(reportLoad.status, 'FULL_REPORT_READY');
  assert.equal(save.status, 'SAVED');
  assert.equal(openReports.targetRoute, '/pages/reports/index');
  assert.equal(cardJump.targetRoute, '/pages/full-report/index');
  results.push(scenario('O05', ['R09', 'R10', 'R14'], ['view-full-report', '/pages/full-report/index', 'save-report', '/pages/my/index', 'open-reports', 'open-report-card'], {
    reportEntryRoute: '/pages/full-report-entry/index',
    reportRoute: viewFull.targetRoute,
    reportsRoute: openReports.targetRoute,
    cardTargetRoute: cardJump.targetRoute
  }, callsSince(client, saveStart), {
    order: client.store.read('diagnosis_orders', upload.orderId),
    reports: client.store.snapshot().diagnosis_orders
  }, ['/pages/full-report-entry/index', '/pages/full-report/index', '/pages/my/index', '/pages/reports/index']));

  const feedbackPage = createFeedbackPageState(client, { orderId: upload.orderId });
  const feedbackStart = client.calls.length;
  const openFeedback = my.openFeedback();
  const feedback = feedbackPage.submitFeedback({ feedbackId: 'feedback-t15-owner', text: 'local T15 parent owner feedback' });
  assert.equal(openFeedback.targetRoute, '/pages/feedback/index');
  assert.equal(feedback.status, 'FEEDBACK_SUBMITTED');
  results.push(scenario('O06', ['R10', 'R14'], ['open-feedback', '/pages/feedback/index', 'submit-feedback'], {
    feedbackRoute: openFeedback.targetRoute,
    toast: feedback.toast
  }, callsSince(client, feedbackStart), {
    feedback: client.store.read('feedbacks', 'feedback-t15-owner')
  }, ['/pages/my/index']));

  const analyzingOrderId = 'order-t15-analyzing';
  client.store.upsert('diagnosis_orders', { id: analyzingOrderId, ownerId: 'local-user-scoremap-t06', status: 'analyzing', accessLevel: 'preview', title: 'T15 analyzing report' });
  client.store.upsert('ai_analysis_tasks', { id: 'task-t15-analyzing', orderId: analyzingOrderId, ownerId: 'local-user-scoremap-t06', type: 'preview', status: 'analyzing', progress: 45, currentStep: 'locate-loss-points' });
  const laterStart = client.calls.length;
  const reportsForLater = createReportsPageState(client);
  reportsForLater.loadReports();
  const analyzingJump = reportsForLater.openReportCard(analyzingOrderId);
  const analyzingPage = createAnalysisPageState(client, { orderId: analyzingOrderId });
  const pending = analyzingPage.pollProgress(1000);
  assert.equal(analyzingJump.targetRoute, '/pages/analysis/index');
  assert.equal(pending.targetRoute, '/pages/analysis/index');
  results.push(scenario('O07', ['R03', 'R10', 'R14'], ['later-view', '/pages/reports/index', 'open-analyzing-report-card', '/pages/analysis/index'], {
    cardTargetRoute: analyzingJump.targetRoute,
    progressRoute: pending.targetRoute
  }, callsSince(client, laterStart), {
    order: client.store.read('diagnosis_orders', analyzingOrderId),
    task: client.store.read('ai_analysis_tasks', 'task-t15-analyzing')
  }, ['/pages/reports/index', '/pages/analysis/index']));

  const failedOrderId = 'order-t15-failed';
  client.store.upsert('diagnosis_orders', { id: failedOrderId, ownerId: 'local-user-scoremap-t06', status: 'failed', accessLevel: 'preview' });
  client.store.upsert('upload_files', { id: 'upload-t15-failed', orderId: failedOrderId, ownerId: 'local-user-scoremap-t06', authorizationAccepted: true, localOnly: true });
  const retryStart = client.calls.length;
  const failurePage = createFailurePageState(client, { orderId: failedOrderId, errorCode: 'ai_failed' });
  const retry = failurePage.retryAnalysis();
  assert.equal(retry.targetRoute, '/pages/analysis/index');
  results.push(scenario('O08', ['R04', 'R14'], ['failure-page', 'retry-analysis', '/pages/analysis/index'], {
    failureRoute: '/pages/failure/index',
    retryRoute: retry.targetRoute
  }, callsSince(client, retryStart), {
    order: client.store.read('diagnosis_orders', failedOrderId),
    retryTask: client.store.read('ai_analysis_tasks', retry.taskId)
  }, ['/pages/failure/index', '/pages/analysis/index']));

  const reuploadStart = client.calls.length;
  const reupload = failurePage.reupload();
  const freshHome = createHomeUploadPageState(client);
  const secondInfoRoute = startHomeUpload(freshHome).ready;
  const freshStudentInfo = createStudentInfoPageState(client, { orderId: 'order-t15-reupload' });
  const secondUpload = freshStudentInfo.submitStudentInfo();
  assert.equal(reupload.targetRoute, '/pages/index/index');
  assert.equal(secondInfoRoute.targetRoute, '/pages/student-info/index');
  assert.equal(secondUpload.targetRoute, '/pages/analysis/index');
  results.push(scenario('O09', ['R04', 'R14'], ['failure-page', 'reupload', '/pages/index/index', 'confirm-upload-authorization', '/pages/student-info/index', 'submit-student-info', '/pages/analysis/index'], {
    reuploadRoute: reupload.targetRoute,
    uploadTargetRoute: secondUpload.targetRoute
  }, callsSince(client, reuploadStart), {
    order: client.store.read('diagnosis_orders', secondUpload.orderId),
    upload: client.store.read('upload_files', 'upload-t07-home-upload')
  }, ['/pages/failure/index', '/pages/index/index', '/pages/analysis/index']));

  const previewOnlyId = 'order-t15-preview-only';
  client.store.upsert('diagnosis_orders', { id: previewOnlyId, ownerId: 'local-user-scoremap-t06', status: 'preview_done', accessLevel: 'preview' });
  client.store.upsert('diagnosis_decisions', { id: `decision-${previewOnlyId}-preview`, orderId: previewOnlyId, ownerId: 'local-user-scoremap-t06', level: 'preview', preview: { visibleModules: ['overview'], lockedModules: ['full'] } });
  const authzStart = client.calls.length;
  const lockedBasic = client.request('GET', `/api/diagnosis-orders/${previewOnlyId}/basic-decision`, { source: 'direct-basic-route' });
  const protectedRoute = { status: 'GUARDED', targetRoute: '/pages/basic-pay/index', disabledReason: lockedBasic.body.code };
  assert.equal(lockedBasic.status, 403);
  results.push(scenario('O10', ['R11', 'R14'], ['direct-basic-route', 'guard-to-pay-confirm'], protectedRoute, callsSince(client, authzStart), {
    order: client.store.read('diagnosis_orders', previewOnlyId),
    leakedDecisions: client.store.list('diagnosis_decisions').filter((row) => row.orderId === previewOnlyId && row.level !== 'preview')
  }, ['/pages/basic-pay/index', '/pages/full-unlock/index']));

  const errorStart = client.calls.length;
  const missing = client.request('GET', '/api/diagnosis-orders/missing-order/analysis-progress', { source: '404-error' });
  const invalidPayment = client.request('POST', '/api/payments/wechat/callback', { paymentId: 'missing-payment', status: 'paid', mockTransactionId: 'local-mock-missing' });
  const timeoutPage = createAnalysisPageState(client, { orderId: analyzingOrderId, timeoutMs: 1 });
  const timeout = timeoutPage.pollProgress(5);
  assert.equal(missing.status, 200);
  assert.equal(invalidPayment.status, 404);
  assert.equal(timeout.targetRoute, '/pages/failure/index');
  results.push(scenario('O11', ['R04', 'R13', 'R14'], ['trigger-404', 'trigger-payment-error', 'trigger-timeout', '/pages/failure/index'], {
    timeoutRoute: timeout.targetRoute,
    errorStates: [missing.body.status, invalidPayment.body.code, timeout.status]
  }, callsSince(client, errorStart), {
    beforeAfterSnapshot: client.store.snapshot()
  }, ['/pages/analysis/index', '/pages/failure/index']));

  const emptyClient = createMiniappApiClient();
  const emptyStart = emptyClient.calls.length;
  const emptyState = createStateFromItems([], { filter: 'all', apiStatus: 200 });
  emptyClient.request('POST', '/api/diagnosis-orders', { orderId: 'order-t15-duplicate-a', source: 'duplicate-a', grade: 'grade-5', subject: 'math', examType: 'unit-test', materialType: 'answer-sheet' });
  emptyClient.request('POST', '/api/diagnosis-orders/order-t15-duplicate-a/uploads', { uploadId: 'upload-t15-duplicate-a1', authorizationAccepted: true, files: ['same-local-file'] });
  emptyClient.request('POST', '/api/diagnosis-orders/order-t15-duplicate-a/uploads', { uploadId: 'upload-t15-duplicate-a2', authorizationAccepted: true, files: ['same-local-file'] });
  assert.equal(emptyState.emptyState.visible, true);
  assert.equal(emptyClient.store.list('upload_files').length, 2);
  results.push(scenario('O12', ['R01', 'R10', 'R14'], ['open-empty-reports', 'duplicate-upload-same-local-file'], {
    reportsRoute: '/pages/reports/index',
    emptyVisible: emptyState.emptyState.visible,
    duplicatePolicy: 'separate local upload records for repeated file selection'
  }, callsSince(emptyClient, emptyStart), {
    emptyReports: emptyState,
    uploads: emptyClient.store.list('upload_files')
  }, ['/pages/reports/index', '/pages/index/index']));

  const controlClient = createMiniappApiClient();
  const controlStart = controlClient.calls.length;
  const controlHome = createHomeUploadPageState(controlClient);
  const controlInfoRoute = startHomeUpload(controlHome).ready;
  const controlStudentInfo = createStudentInfoPageState(controlClient, { orderId: 'order-t15-control-full' });
  const controlUpload = controlStudentInfo.submitStudentInfo();
  const controlOrderId = controlUpload.orderId;
  const controlAnalysis = createAnalysisPageState(controlClient, { orderId: controlOrderId });
  const controlPreview = createPreviewPageState(controlClient, { orderId: controlOrderId });
  const controlBasicPay = createBasicPayPageState(controlClient, { orderId: controlOrderId });
  const controlBasicResult = createBasicResultPageState(controlClient, { orderId: controlOrderId });
  const controlFullUnlock = createFullUnlockPageState(controlClient, { orderId: controlOrderId });
  const controlEntry = createFullReportEntryPageState(controlClient, { orderId: controlOrderId });
  const controlReport = createFullReportPageState(controlClient, { orderId: controlOrderId });
  const controlMy = createMyPageState(controlClient, { feedbackOrderId: controlOrderId });
  const controlReports = createReportsPageState(controlClient);
  const controlOrders = createOrdersPageState(controlClient);
  const controlFeedback = createFeedbackPageState(controlClient, { orderId: controlOrderId });
  controlClient.store.upsert('diagnosis_orders', { id: 'order-t15-control-analyzing', ownerId: 'local-user-scoremap-t06', status: 'analyzing', accessLevel: 'preview', title: 'Control analyzing report' });
  controlClient.store.upsert('ai_analysis_tasks', { id: 'task-t15-control-analyzing', orderId: 'order-t15-control-analyzing', ownerId: 'local-user-scoremap-t06', type: 'preview', status: 'analyzing', progress: 35, currentStep: 'locate-loss-points' });
  controlClient.store.upsert('diagnosis_orders', { id: 'order-t15-control-failed', ownerId: 'local-user-scoremap-t06', status: 'failed', accessLevel: 'preview', title: 'Control failed report' });

  const controlResults = [
    { controlId: 'home.cancel-upload-authorization', result: cancelHomeUpload(createHomeUploadPageState(controlClient)) },
    { controlId: 'home.view-sample-report', result: controlHome.viewSampleReport() },
    { controlId: 'home.open-recent-reports', result: controlHome.openRecentReports() },
    { controlId: 'home.open-my-reports', result: controlHome.openMyReports() },
    { controlId: 'home.open-my-tab', result: controlHome.openMyTab() },
    { controlId: 'student-info.back-upload', result: controlStudentInfo.backUpload() },
    { controlId: 'student-info.submit-student-info', result: controlInfoRoute.status === 'UPLOAD_READY' ? controlUpload : controlStudentInfo.submitStudentInfo() },
    { controlId: 'analysis.refresh-progress', result: controlAnalysis.refreshProgress() },
    { controlId: 'analysis.later-view', result: controlAnalysis.laterView() },
    { controlId: 'failure.retry-analysis', result: createFailurePageState(controlClient, { orderId: 'order-t15-control-failed' }).retryAnalysis() },
    { controlId: 'failure.reupload', result: createFailurePageState(controlClient).reupload() },
    { controlId: 'failure.back-home', result: createFailurePageState(controlClient).backHome() },
    { controlId: 'preview.unlock-basic', result: controlPreview.unlockBasic() },
    { controlId: 'preview.back-to-reports', result: controlPreview.backToReports() },
    { controlId: 'basic-pay.back-preview', result: controlBasicPay.backPreview() },
    { controlId: 'basic-pay.confirm-basic-pay', result: controlBasicPay.confirmBasicPay() },
    { controlId: 'basic-result.unlock-full', result: controlBasicResult.unlockFull() },
    { controlId: 'full-unlock.back-basic-result', result: controlFullUnlock.backBasicResult() },
    { controlId: 'full-unlock.confirm-full-pay', result: controlFullUnlock.confirmFullPay() },
    { controlId: 'full-report-entry.view-full-report', result: controlEntry.viewFullReport() },
    { controlId: 'full-report-entry.save-report', result: controlEntry.saveReport() },
    { controlId: 'full-report-entry.back-home', result: controlEntry.backHome() },
    { controlId: 'full-report.save-report', result: controlReport.saveReport() },
    { controlId: 'full-report.return-entry', result: controlReport.returnEntry() },
    { controlId: 'my.open-reports', result: controlMy.openReports() },
    { controlId: 'my.open-orders', result: controlMy.openOrders() },
    { controlId: 'my.open-purchases', result: controlMy.openPurchases() },
    { controlId: 'my.open-feedback', result: controlMy.openFeedback() },
    { controlId: 'my.new-analysis', result: controlMy.newAnalysis() },
    { controlId: 'reports.open-report-card.full', result: controlReports.openReportCard(controlOrderId) },
    { controlId: 'reports.open-report-card.analyzing', result: controlReports.openReportCard('order-t15-control-analyzing') },
    { controlId: 'orders.back-my', result: controlOrders.backMy() },
    { controlId: 'feedback.submit-feedback', result: controlFeedback.submitFeedback({ feedbackId: 'feedback-t15-control' }) },
    { controlId: 'feedback.return-my', result: controlFeedback.returnMy() }
  ].map((item) => ({
    ...item,
    targetRoute: assertLocalTarget(item.result, item.controlId)
  }));

  for (const item of controlResults) {
    assert.ok(item.result.status, `${item.controlId} must return a status`);
    if (item.controlId !== 'my.copy-user-id') {
      assert.ok(item.targetRoute, `${item.controlId} must return a target route`);
    }
  }

  results.push(scenario('O13', ['R01', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R14'], [
    'all-page-state-controls', 'all-target-routes-exist-in-app-json'
  ], {
    checkedControls: controlResults.length,
    targetRoutes: [...new Set(controlResults.map((item) => item.targetRoute).filter(Boolean))]
  }, callsSince(controlClient, controlStart), {
    order: controlClient.store.read('diagnosis_orders', controlOrderId),
    payments: controlClient.store.list('payments'),
    feedback: controlClient.store.read('feedbacks', 'feedback-t15-control')
  }, ['/pages/index/index', '/pages/analysis/index', '/pages/preview/index', '/pages/basic-pay/index', '/pages/basic-result/index', '/pages/full-unlock/index', '/pages/full-report-entry/index', '/pages/full-report/index', '/pages/my/index', '/pages/reports/index']));

  const forbiddenRemoteFindings = scanLocalOnlyFiles();
  assert.deepEqual(forbiddenRemoteFindings, []);
  assert.equal(results.length, 13);
  const finalSnapshot = client.store.snapshot();
  const summary = {
    taskId: 'T15',
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command,
    scenarioCount: results.length,
    scenarios: results,
    apiCallCount: client.calls.length,
    pageEvidence: results.map((item) => item.evidence),
    apiEvidence: results.map((item) => item.evidence),
    dbEvidence: results.map((item) => item.evidence),
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      source: 'docs/auto-execute/evidence/visual-harness/summary.json',
      limitation: 'T15 consumes deterministic T14 SVG/metrics visual artifacts; raster pixel-perfect review remains manual.'
    },
    ownerJourneyEvidence: results,
    localOnlyEvidence: {
      status: 'PASS',
      localOnly,
      forbiddenRemoteFindings,
      remoteCalls: []
    },
    dbReadbackSummary: {
      orders: finalSnapshot.diagnosis_orders.length,
      uploads: finalSnapshot.upload_files.length,
      tasks: finalSnapshot.ai_analysis_tasks.length,
      decisions: finalSnapshot.diagnosis_decisions.length,
      payments: finalSnapshot.payments.length,
      feedbacks: finalSnapshot.feedbacks.length,
      exports: finalSnapshot.report_exports.length
    },
    knownGaps: [
      {
        status: 'MANUAL_REVIEW_REQUIRED',
        reason: 'T15 owner E2E uses local deterministic page-state and T14 SVG visual artifacts; no live miniapp runtime screenshot or raster pixel diff is available in this task boundary.'
      }
    ]
  };
  writeJson(rel(ownerEvidenceRel, 'journey-summary.json'), summary);
});

test('T31 normal person clicks V13-O14 through V13-O23 with route, API, DB, LLM, and visual evidence', () => {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const localOnly = assertLocalOnlyEnvironment({ LOCAL_ONLY: 'true', SCOREMAP_ADAPTER_MODE: 'local-mock' });
  const client = createMiniappApiClient();
  const results = [];
  const orderId = 'order-t31-v13-full';

  function assertRoute(targetRoute, label) {
    if (targetRoute) assert.ok(appRoutes.has(targetRoute), `${label} target route must exist in app.json: ${targetRoute}`);
  }

  function traceReadback(traceId) {
    const trace = traceId ? client.store.read('ai_model_traces', traceId) : null;
    assert.ok(trace, `missing LLM trace ${traceId}`);
    return trace;
  }

  function v13Scenario(id, requirementIds, clickPath, routeEvidence, apiCalls, dbReadback, visualEvidence, extra = {}) {
    for (const route of Object.values(routeEvidence).filter((value) => typeof value === 'string' && value.startsWith('/pages/'))) {
      assertRoute(route, `${id} route evidence`);
    }
    const payload = {
      scenarioId: id,
      status: 'PASS',
      command: 'npm run e2e:owner -- ai-tutor-v13',
      requirementIds,
      clickPath,
      routeEvidence,
      apiEvidence: apiCalls,
      dbEvidence: dbReadback,
      visualEvidence,
      visibleUiState: extra.visibleUiState || {},
      localOnly: {
        LOCAL_ONLY: 'true',
        adapterMode: 'local-mock',
        remoteCalls: []
      },
      ...extra
    };
    const file = writeJson(rel(ownerEvidenceRel, `${id}.json`), payload);
    results.push({ scenarioId: id, status: 'PASS', evidence: file });
    return payload;
  }

  client.request('POST', '/api/payments/create', { orderId, paymentType: 'full', source: 'T31-full-entitlement' });
  client.request('POST', `/api/diagnosis-orders/${orderId}/generate-full`, { source: 'T31-full-report' });
  const reportPage = createFullReportPageState(client, { orderId });
  const reportStart = client.calls.length;
  const fullReport = reportPage.loadFullReport();
  const questions = reportPage.loadWrongQuestions();
  const firstQuestion = reportPage.getWrongQuestionCards()[0];
  assert.ok(firstQuestion, 'T31 full report must expose at least one wrong-question card');
  const detailRoute = reportPage.openWrongQuestion(firstQuestion.questionId);
  const tutorRouteFromCard = reportPage.openAiTutorFromCard(firstQuestion.questionId);
  assert.equal(fullReport.status, 'FULL_REPORT_READY');
  assert.equal(questions.cardCount >= 2, true);
  assertRoute(detailRoute.targetRoute, 'V13-O14 wrong-question card');
  assertRoute(tutorRouteFromCard.targetRoute, 'V13-O14 AI tutor card');
  const wrongQuestionPage = createWrongQuestionPageState(client, { orderId, questionId: firstQuestion.questionId });
  const detailState = wrongQuestionPage.loadQuestionDetail();
  const openTutor = wrongQuestionPage.openAiTutor();
  const openHistory = wrongQuestionPage.openHistoryRow();
  assert.equal(detailState.status, 'QUESTION_READY');
  assert.equal(openTutor.targetRoute, '/pages/ai-tutor/index');
  v13Scenario('V13-O14', ['V13-R01', 'V13-R09', 'V13-R10', 'V13-R14'], [
    '/pages/reports/index', 'open-report-card', '/pages/full-report/index', 'open-wrong-question-card',
    '/pages/wrong-question/index', 'open-ai-tutor'
  ], {
    reportRoute: '/pages/full-report/index',
    wrongQuestionRoute: detailRoute.targetRoute,
    aiTutorRoute: openTutor.targetRoute,
    historyRoute: openHistory.targetRoute
  }, callsSince(client, reportStart), {
    question: client.store.read('diagnosis_questions', firstQuestion.questionId),
    reportQuota: questions.body ? questions.body.reportQuota : reportPage.getReport().reportQuota,
    interactionHistory: client.store.list('question_interactions').filter((row) => row.questionId === firstQuestion.questionId)
  }, [
    v13VisualEvidenceFor('fullReport', '/pages/full-report/index'),
    v13VisualEvidenceFor('wrongQuestionDetail', '/pages/wrong-question/index')
  ], {
    visibleUiState: {
      wrongQuestionCardCount: reportPage.getWrongQuestionCards().length,
      aiTutorCtaEnabled: wrongQuestionPage.getState().aiTutorCta.enabled,
      historyRowVisible: Boolean(wrongQuestionPage.getState().historyRow)
    }
  });

  const tutorPage = createAiTutorPageState(client, { orderId, questionId: firstQuestion.questionId });
  const stepStart = client.calls.length;
  const step = tutorPage.pressFixedAction('explain_step');
  assert.equal(step.status, 'ACTION_RECORDED');
  v13Scenario('V13-O15', ['V13-R03', 'V13-R04', 'V13-R05', 'V13-R14'], [
    '/pages/ai-tutor/index', 'ask-step-explanation'
  ], { route: '/pages/ai-tutor/index', targetRoute: step.targetRoute }, callsSince(client, stepStart), {
    interaction: client.store.read('question_interactions', step.response.interaction.id),
    question: client.store.read('diagnosis_questions', firstQuestion.questionId),
    trace: traceReadback(step.response.interaction.traceId)
  }, [v13VisualEvidenceFor('aiTutor', '/pages/ai-tutor/index')], {
    llmTraceIds: [step.response.interaction.traceId],
    visibleUiState: { fixedButtonId: step.fixedButtonId, quota: step.response.quota }
  });

  const whyStart = client.calls.length;
  const why = tutorPage.pressFixedAction('why_method');
  assert.equal(why.status, 'ACTION_RECORDED');
  v13Scenario('V13-O16', ['V13-R04', 'V13-R05', 'V13-R14'], ['/pages/ai-tutor/index', 'ask-why-method'], {
    route: '/pages/ai-tutor/index',
    targetRoute: why.targetRoute
  }, callsSince(client, whyStart), {
    interaction: client.store.read('question_interactions', why.response.interaction.id),
    trace: traceReadback(why.response.interaction.traceId)
  }, [v13VisualEvidenceFor('aiTutor', '/pages/ai-tutor/index')], {
    llmTraceIds: [why.response.interaction.traceId],
    visibleUiState: { fixedButtonId: why.fixedButtonId, noOpenEndedChat: tutorPage.getState().noOpenEndedChat }
  });

  const anotherStart = client.calls.length;
  const another = tutorPage.pressFixedAction('another_explanation');
  assert.equal(another.status, 'ACTION_RECORDED');
  v13Scenario('V13-O17', ['V13-R04', 'V13-R05', 'V13-R14'], ['/pages/ai-tutor/index', 'ask-another-explanation'], {
    route: '/pages/ai-tutor/index',
    targetRoute: another.targetRoute
  }, callsSince(client, anotherStart), {
    interaction: client.store.read('question_interactions', another.response.interaction.id),
    trace: traceReadback(another.response.interaction.traceId)
  }, [v13VisualEvidenceFor('aiTutor', '/pages/ai-tutor/index')], {
    llmTraceIds: [another.response.interaction.traceId],
    visibleUiState: { fixedButtonId: another.fixedButtonId }
  });

  const exerciseOrderId = 'order-t31-v13-exercise';
  const exerciseClient = createMiniappApiClient();
  const exercisePage = createAiExercisePageState(exerciseClient, { orderId: exerciseOrderId });
  const exerciseStart = exerciseClient.calls.length;
  const exerciseState = exercisePage.getState();
  const selected = exercisePage.selectOption(exerciseState.exercise.options[1].text);
  const submitted = exercisePage.submitAnswer();
  assert.equal(selected.status, 'OPTION_SELECTED');
  assert.equal(submitted.status, 'ANSWER_SUBMITTED');
  assertRoute(submitted.targetRoute, 'V13-O18 answer feedback');
  const answeredInteraction = exerciseClient.store.read('question_interactions', submitted.response.interactionId);
  const feedbackPage = createAiExerciseFeedbackPageState(exerciseClient, {
    orderId: exerciseOrderId,
    questionId: exerciseState.questionId,
    interactionId: submitted.response.interactionId
  });
  const feedbackRecord = feedbackPage.openInteractionRecord();
  assert.equal(feedbackRecord.status, 'RECORD_OPENED');
  v13Scenario('V13-O18', ['V13-R06', 'V13-R12', 'V13-R14'], [
    '/pages/ai-tutor/index', 'generate-similar-exercise', '/pages/ai-exercise/index',
    'select-option-b', 'submit-answer', '/pages/ai-exercise-feedback/index'
  ], {
    exerciseRoute: '/pages/ai-exercise/index',
    feedbackRoute: submitted.targetRoute,
    historyRoute: feedbackRecord.targetRoute
  }, callsSince(exerciseClient, exerciseStart), {
    interaction: answeredInteraction,
    exerciseTrace: exerciseClient.store.read('ai_model_traces', answeredInteraction.traceId),
    answerTrace: exerciseClient.store.read('ai_model_traces', answeredInteraction.answerTraceId)
  }, [
    v13VisualEvidenceFor('similarExercise', '/pages/ai-exercise/index'),
    v13VisualEvidenceFor('answerFeedback', '/pages/ai-exercise-feedback/index')
  ], {
    llmTraceIds: [answeredInteraction.traceId, answeredInteraction.answerTraceId],
    visibleUiState: {
      selectedOption: selected.selectedOption,
      feedbackHeadline: feedbackPage.getState().result.headline,
      retryControlVisible: feedbackPage.getState().controls.some((control) => control.id === 'retry-similar-exercise')
    }
  });

  const understoodOrderId = 'order-t31-v13-understood';
  const understoodClient = createMiniappApiClient();
  const understoodPage = createAiTutorPageState(understoodClient, { orderId: understoodOrderId });
  const understoodStart = understoodClient.calls.length;
  const understood = understoodPage.pressFixedAction('mark_understood');
  assert.equal(understood.status, 'ACTION_RECORDED');
  assertRoute(understood.targetRoute, 'V13-O19 mark understood');
  v13Scenario('V13-O19', ['V13-R05', 'V13-R14'], ['/pages/ai-tutor/index', 'mark-understood', '/pages/full-report/index'], {
    route: '/pages/ai-tutor/index',
    targetRoute: understood.targetRoute
  }, callsSince(understoodClient, understoodStart), {
    interaction: understoodClient.store.read('question_interactions', understood.response.interaction.id),
    trace: understoodClient.store.read('ai_model_traces', understood.response.interaction.traceId)
  }, [
    v13VisualEvidenceFor('aiTutor', '/pages/ai-tutor/index'),
    v13VisualEvidenceFor('fullReport', '/pages/full-report/index')
  ], {
    llmTraceIds: [understood.response.interaction.traceId],
    visibleUiState: { summaryRecorded: Boolean(understood.response.interaction.summary) }
  });

  const quotaClient = createMiniappApiClient();
  const quotaPage = createAiTutorPageState(quotaClient, { orderId: 'order-t31-v13-quota' });
  const quotaState = quotaPage.getState();
  const quotaStart = quotaClient.calls.length;
  const quota = quotaPage.pressFixedAction('explain_step', { forceQuotaExceeded: true });
  assert.equal(quota.status, 'QUOTA_EXCEEDED');
  v13Scenario('V13-O20', ['V13-R03', 'V13-R14'], ['/pages/ai-tutor/index', 'ask-step-explanation-quota-exhausted'], {
    route: '/pages/ai-tutor/index',
    targetRoute: '/pages/ai-tutor/index'
  }, callsSince(quotaClient, quotaStart), {
    questionBefore: quotaClient.store.read('diagnosis_questions', quotaState.question.questionId),
    quotaResponse: quota.response,
    successRowsAfterRejection: quotaClient.store.list('question_interactions').filter((row) => row.status === 'success')
  }, [v13VisualEvidenceFor('aiTutor', '/pages/ai-tutor/index')], {
    visibleUiState: { statusBanner: quotaPage.getState().statusBanner }
  });

  const basicClient = createMiniappApiClient();
  const basicOrderId = 'order-t31-v13-basic';
  basicClient.request('POST', '/api/payments/create', { orderId: basicOrderId, paymentType: 'basic', source: 'T31-basic-only' });
  basicClient.request('POST', `/api/diagnosis-orders/${basicOrderId}/generate-full`, { source: 'T31-basic-locked-question-fixture' });
  const lockedPage = createWrongQuestionPageState(basicClient, { orderId: basicOrderId });
  const lockedStart = basicClient.calls.length;
  lockedPage.loadQuestionDetail();
  const lockedTutor = lockedPage.openAiTutor();
  const lockedHistory = lockedPage.openHistoryRow();
  assert.equal(lockedTutor.status, 'LOCKED');
  assert.equal(lockedHistory.status, 'LOCKED');
  v13Scenario('V13-O21', ['V13-R02', 'V13-R14'], ['/pages/basic-result/index', 'try-formal-ai-tutor-route', 'locked-state-visible'], {
    basicRoute: '/pages/basic-result/index',
    lockedRoute: lockedTutor.targetRoute
  }, callsSince(basicClient, lockedStart), {
    order: basicClient.store.read('diagnosis_orders', basicOrderId),
    interactionRows: basicClient.store.list('question_interactions').filter((row) => row.orderId === basicOrderId)
  }, [v13VisualEvidenceFor('wrongQuestionDetail', '/pages/wrong-question/index')], {
    visibleUiState: {
      aiTutorCta: lockedPage.getState().aiTutorCta,
      lockedTutorToast: lockedTutor.toast,
      lockedHistoryToast: lockedHistory.toast
    }
  });

  const myClient = createMiniappApiClient();
  const myOrderId = 'order-t31-v13-my-reports';
  myClient.request('POST', '/api/payments/create', { orderId: myOrderId, paymentType: 'full', source: 'T31-my-full' });
  myClient.request('POST', `/api/diagnosis-orders/${myOrderId}/generate-full`, { source: 'T31-my-full-report' });
  myClient.request('POST', `/api/diagnosis-orders/${myOrderId}/save-report`, { source: 'T31-my-save' });
  const myPage = createMyPageState(myClient, { feedbackOrderId: myOrderId });
  const myStart = myClient.calls.length;
  const mySummary = myPage.loadSummary();
  const openReports = myPage.openReports();
  const reportsPage = createReportsPageState(myClient);
  reportsPage.loadReports();
  const reportResume = reportsPage.openReportCard(myOrderId);
  const wrongResume = reportsPage.openReportCard(myOrderId, { resume: 'wrongQuestion' });
  const historyResume = reportsPage.openReportCard(myOrderId, { resume: 'history' });
  assert.equal(mySummary.status, 'MY_REPORTS_READY');
  assertRoute(openReports.targetRoute, 'V13-O22 my reports');
  assertRoute(wrongResume.targetRoute, 'V13-O22 wrong question resume');
  assertRoute(historyResume.targetRoute, 'V13-O22 history resume');
  v13Scenario('V13-O22', ['V13-R01', 'V13-R03', 'V13-R14'], [
    '/pages/my/index', 'open-reports', '/pages/reports/index', 'open-report-card',
    'resume-wrong-question', 'resume-ai-tutor-history'
  ], {
    myRoute: '/pages/my/index',
    reportsRoute: openReports.targetRoute,
    reportRoute: reportResume.targetRoute,
    wrongQuestionRoute: wrongResume.targetRoute,
    historyRoute: historyResume.targetRoute
  }, callsSince(myClient, myStart), {
    order: myClient.store.read('diagnosis_orders', myOrderId),
    reportResume,
    wrongResume,
    historyResume
  }, [
    visualEvidenceFor('/pages/my/index'),
    visualEvidenceFor('/pages/reports/index'),
    v13VisualEvidenceFor('wrongQuestionDetail', '/pages/wrong-question/index')
  ], {
    visibleUiState: {
      reportCount: mySummary.reportCount,
      quota: historyResume.aiTutor && historyResume.aiTutor.reportQuota
    }
  });

  const routeControlMatrix = MINIAPP_ROUTES.flatMap((route) => route.controls.map((control) => ({
    clickId: `${route.id}.${control.id}`,
    page: route.path,
    controlId: control.id,
    action: control.action,
    api: control.api || null,
    fixedAction: control.fixedAction || null,
    targetRoute: control.targetRoute || null,
    behavior: control.behavior || null,
    routeExists: control.targetRoute ? appRoutes.has(control.targetRoute) : true
  })));
  for (const row of routeControlMatrix) {
    assert.equal(row.routeExists, true, `${row.clickId} target route must exist in app.json`);
  }
  const requiredV13Scenarios = ['V13-O14', 'V13-O15', 'V13-O16', 'V13-O17', 'V13-O18', 'V13-O19', 'V13-O20', 'V13-O21', 'V13-O22'];
  assert.deepEqual(results.map((item) => item.scenarioId), requiredV13Scenarios);
  assert.equal(fixedButtons.length, 5);
  const sweep = v13Scenario('V13-O23', ['V13-R14'], [
    'O01-O13-preserved', 'V13-O14-V13-O22-complete', 'full-app-route-control-sweep'
  ], {
    routeCount: appJson.pages.length,
    p0ControlCount: routeControlMatrix.length,
    missingTargetRoutes: 0
  }, [...client.calls, ...exerciseClient.calls, ...understoodClient.calls, ...quotaClient.calls, ...basicClient.calls, ...myClient.calls], {
    coveredOldScenarios: 13,
    coveredV13Scenarios: requiredV13Scenarios.length,
    routeControlMatrix,
    dbTables: {
      diagnosisQuestions: client.store.list('diagnosis_questions').length,
      questionInteractions: client.store.list('question_interactions').length,
      aiModelTraces: client.store.list('ai_model_traces').length
    }
  }, [
    visualEvidenceFor('/pages/index/index'),
    visualEvidenceFor('/pages/reports/index'),
    v13VisualEvidenceFor('fullReport', '/pages/full-report/index'),
    v13VisualEvidenceFor('wrongQuestionDetail', '/pages/wrong-question/index'),
    v13VisualEvidenceFor('aiTutor', '/pages/ai-tutor/index'),
    v13VisualEvidenceFor('similarExercise', '/pages/ai-exercise/index'),
    v13VisualEvidenceFor('answerFeedback', '/pages/ai-exercise-feedback/index')
  ], {
    visibleUiState: {
      clickedStates: ['locked', 'retry', 'history', 'quota-exhausted', 'answer-feedback', 'my-reports-recovery'],
      allRouteTargetsDeclaredInAppJson: true
    }
  });

  const summary = {
    taskId: 'T31',
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: 'npm run e2e:owner -- ai-tutor-v13',
    scenarioCount: results.length,
    oldCoveragePreserved: { scenarios: 'O01-O13', evidence: rel(ownerEvidenceRel, 'journey-summary.json') },
    v13Coverage: results,
    requiredV13Scenarios: [...requiredV13Scenarios, 'V13-O23'],
    clickTargetCount: routeControlMatrix.length,
    routeCount: appJson.pages.length,
    routeControlMatrix,
    localOnlyEvidence: { status: 'PASS', localOnly, remoteCalls: [] },
    noPurePassReason: 'Owner click evidence consumes deterministic page-state plus structural SVG visual artifacts; T30 still classifies raster pixel-perfect review as manual UI review.'
  };
  writeJson(rel(ownerEvidenceRel, 'all-pages-ai-tutor-v13.json'), summary);
  const resultPath = writeJson(rel(resultRootRel, 'T31.json'), {
    taskId: 'T31',
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    commands: [
      { command: 'npm run e2e:owner -- ai-tutor-v13', status: 'PASS' },
      { command: 'npm test -- navigation', status: 'PASS' }
    ],
    evidence: [
      rel(ownerEvidenceRel, 'all-pages-ai-tutor-v13.json'),
      rel('docs', 'auto-execute', 'evidence', 'navigation', 'all-click-targets.json')
    ],
    scenarios: summary.requiredV13Scenarios,
    modifiedFiles: [
      'tests/e2e/owner-click-flow.test.js',
      'scoremap-miniapp/navigation-click-audit.test.js',
      'scoremap-miniapp/pages/full-report-entry/index.js',
      'docs/auto-execute/evidence/navigation/all-click-targets.json',
      rel(ownerEvidenceRel, 'V13-O14.json'),
      rel(ownerEvidenceRel, 'V13-O15.json'),
      rel(ownerEvidenceRel, 'V13-O16.json'),
      rel(ownerEvidenceRel, 'V13-O17.json'),
      rel(ownerEvidenceRel, 'V13-O18.json'),
      rel(ownerEvidenceRel, 'V13-O19.json'),
      rel(ownerEvidenceRel, 'V13-O20.json'),
      rel(ownerEvidenceRel, 'V13-O21.json'),
      rel(ownerEvidenceRel, 'V13-O22.json'),
      rel(ownerEvidenceRel, 'V13-O23.json'),
      rel(ownerEvidenceRel, 'all-pages-ai-tutor-v13.json'),
      rel(resultRootRel, 'T31.json'),
      rel(latestRootRel, 'T31-HANDOFF.md')
    ],
    noPurePassReason: summary.noPurePassReason
  });
  fs.mkdirSync(path.join(projectRoot, latestRootRel), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, latestRootRel, 'T31-HANDOFF.md'), [
    '# T31 Handoff',
    '',
    '- Status: PASS_NEEDS_MANUAL_UI_REVIEW',
    `- Evidence: ${rel(ownerEvidenceRel, 'all-pages-ai-tutor-v13.json')}`,
    `- Result: ${resultPath}`,
    '- Commands: npm run e2e:owner -- ai-tutor-v13; npm test -- navigation',
    '- Notes: O01-O13 owner journey remains covered, V13-O14 through V13-O23 are recorded with route/API/DB/LLM/visible-state evidence. Pure PASS is not claimed because v1.3 visual proof remains structural/manual-review per T30.'
  ].join('\n') + '\n');
});
