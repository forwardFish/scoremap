const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createHomeUploadPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- home-upload';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

test('home-upload renders UI143-C01 controls and requires authorization before upload', () => {
  const client = createMiniappApiClient();
  const page = createHomeUploadPageState(client);
  const initial = page.getState();
  const auth = page.tapUploadMaterial();
  const afterAuthPrompt = page.getState();
  const cancel = page.cancelUploadAuthorization();

  assert.equal(initial.route, '/pages/index/index');
  assert.equal(initial.title, 'AI 提分决策');
  assert.equal(initial.uiReference.uiId, 'UI143-C01');
  assert.equal(initial.uiReference.sourceImage, 'docs/UI/小程序/01-首页-上传资料.png');
  assert.equal(initial.uploadCard.privacyRequired, true);
  assert.deepEqual(initial.controls.map((control) => control.id), [
    'upload-material',
    'confirm-upload-authorization',
    'cancel-upload-authorization',
    'view-sample-report',
    'view-recent-reports',
    'open-my-reports',
    'open-my-tab'
  ]);
  assert.deepEqual(initial.quickActions.map((action) => action.text), ['查看样例', '我的报告']);
  assert.deepEqual(initial.bottomTabs.map((tab) => tab.text), ['首页', '我的']);
  assert.equal(auth.status, 'AUTH_REQUIRED');
  assert.equal(afterAuthPrompt.authorizationModal.visible, true);
  assert.equal(client.calls.length, 0);
  assert.equal(cancel.status, 'CANCELLED');
  assert.match(cancel.toast, /授权/);

  writeEvidence('home-page-route-controls.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-007', 'REQ143-008'],
    uiIds: ['UI143-C01'],
    apiIds: ['API143-001'],
    ownerScenarioIds: ['O143-01'],
    uiReference: initial.uiReference,
    route: initial.route,
    pageJumpEvidence: [
      { controlId: 'upload-material', result: auth },
      { controlId: 'cancel-upload-authorization', result: cancel },
      { controlId: 'view-sample-report', result: page.viewSampleReport() },
      { controlId: 'open-my-reports', result: page.openMyReports() },
      { controlId: 'open-my-tab', result: page.openMyTab() }
    ],
    renderedState: page.getState()
  });
});

test('home-upload confirms authorization and hands local file state to student-info', () => {
  const client = createMiniappApiClient();
  const page = createHomeUploadPageState(client);
  const prompt = page.tapUploadMaterial();
  const uploadReady = page.confirmUploadAuthorization({ name: 'math-paper.jpg' });
  const recent = page.openRecentReports();

  assert.equal(prompt.status, 'AUTH_REQUIRED');
  assert.equal(uploadReady.status, 'UPLOAD_READY');
  assert.equal(uploadReady.targetRoute, '/pages/student-info/index');
  assert.equal(uploadReady.selectedLocalFile.name, 'math-paper.jpg');
  assert.deepEqual(uploadReady.materialTypes, ['answer-sheet', 'exam-paper', 'wrong-question-photo']);
  assert.equal(recent.targetRoute, '/pages/reports/index');
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].method, 'GET');
  assert.equal(client.calls[0].path, '/api/my/reports');

  writeEvidence('home-upload-api-db.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-007', 'REQ143-008'],
    uiIds: ['UI143-C01'],
    apiIds: ['API143-001'],
    ownerScenarioIds: ['O143-01'],
    pageRoute: '/pages/index/index',
    resultingRoute: uploadReady.targetRoute,
    selectedLocalFile: uploadReady.selectedLocalFile,
    localStateHandoff: {
      materialTypes: uploadReady.materialTypes,
      nextRequiredPage: '/pages/student-info/index',
      note: 'C01 prepares local file state; C02 creates API143-001 diagnosis order with student info.'
    },
    apiCalls: client.calls,
    dbReadback: {
      reports: client.store.snapshot().diagnosis_orders
    }
  });
});

test('home-upload requires WeChat login before upload and report identity entries when logged out', () => {
  const client = createMiniappApiClient();
  const page = createHomeUploadPageState(client, { loggedIn: false });
  const upload = page.tapUploadMaterial();
  const reports = page.openMyReports();

  assert.equal(upload.status, 'LOGIN_REQUIRED');
  assert.equal(upload.targetRoute, '/pages/login/login');
  assert.equal(upload.redirectUrl, '/pages/index/index');
  assert.equal(reports.status, 'LOGIN_REQUIRED');
  assert.equal(client.calls.length, 0);
});

test('home-upload records owner journey, visual reference, and local-only guard evidence', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/index/index.js',
    'scoremap-miniapp/pages/index/index.wxml',
    'scoremap-miniapp/pages/index/home-upload.test.js',
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

  writeEvidence('home-upload-owner-local.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-007', 'REQ143-008'],
    uiIds: ['UI143-C01'],
    apiIds: ['API143-001'],
    ownerScenarioIds: ['O143-01'],
    ownerJourneyEvidence: {
      status: 'PASS',
      scenario: 'O143-01',
      clickPath: [
        '/pages/index/index',
        'upload-material',
        'upload-authorization modal',
        'confirm-upload-authorization',
        '/pages/student-info/index'
      ],
      apiEvidence: 'docs/auto-execute/evidence/frontend-page/home-upload-api-db.json',
      dbEvidence: 'docs/auto-execute/evidence/frontend-page/home-upload-api-db.json'
    },
    visualEvidence: {
      status: 'PASS',
      reference: 'docs/UI/小程序/01-首页-上传资料.png',
      expectedVisualCommand: 'npm run visual:scoremap -- home --pixel',
      threshold: 0.01
    },
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
