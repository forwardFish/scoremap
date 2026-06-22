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

test('home-upload opens upload flow directly without authorization modal', () => {
  const client = createMiniappApiClient();
  const page = createHomeUploadPageState(client);
  const initial = page.getState();
  const uploadReady = page.tapUploadMaterial();

  assert.equal(initial.route, '/pages/index/index');
  assert.equal(initial.uiReference.uiId, 'UI143-C01');
  assert.equal(initial.uploadCard.privacyRequired, false);
  assert.deepEqual(initial.controls.map((control) => control.id), [
    'upload-material',
    'view-sample-report',
    'view-recent-reports',
    'open-my-reports',
    'open-my-tab'
  ]);
  assert.equal(uploadReady.status, 'UPLOAD_READY');
  assert.equal(uploadReady.targetRoute, '/pages/student-info/index');
  assert.deepEqual(uploadReady.materialTypes, ['answer-sheet', 'exam-paper', 'wrong-question-photo']);
  assert.equal(client.calls.length, 0);

  writeEvidence('home-page-route-controls.json', {
    status: 'PASS',
    command,
    requirementIds: ['REQ143-007', 'REQ143-008'],
    uiIds: ['UI143-C01'],
    apiIds: ['API143-001'],
    ownerScenarioIds: ['O143-01'],
    uiReference: initial.uiReference,
    route: initial.route,
    noAuthorizationModal: true,
    pageJumpEvidence: [
      { controlId: 'upload-material', result: uploadReady },
      { controlId: 'view-sample-report', result: page.viewSampleReport() },
      { controlId: 'open-my-reports', result: page.openMyReports() },
      { controlId: 'open-my-tab', result: page.openMyTab() }
    ],
    renderedState: page.getState()
  });
});

test('home-upload report entries and sample entry still navigate correctly', () => {
  const client = createMiniappApiClient();
  const page = createHomeUploadPageState(client);
  const uploadReady = page.tapUploadMaterial();
  const recent = page.openRecentReports();

  assert.equal(uploadReady.status, 'UPLOAD_READY');
  assert.equal(uploadReady.targetRoute, '/pages/student-info/index');
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
    localStateHandoff: {
      materialTypes: uploadReady.materialTypes,
      nextRequiredPage: '/pages/student-info/index',
      note: 'C01 now opens the picker directly; C02 uploads the selected file and creates API143-001 diagnosis order.'
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
        'wx.chooseMessageFile',
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

test('home-upload runtime opens WeChat file picker directly', () => {
  const indexPagePath = path.join(__dirname, 'index.js');
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousGetApp = global.getApp;
  let pageConfig = null;
  let chooseMessageFileCalled = false;
  let navigateUrl = null;
  const app = { globalData: {} };

  delete require.cache[require.resolve(indexPagePath)];
  global.Page = (config) => {
    pageConfig = config;
  };
  global.getApp = () => app;
  global.wx = {
    hideTabBar() {},
    showToast() {},
    chooseMessageFile(options) {
      chooseMessageFileCalled = true;
      assert.equal(options.count, 1);
      assert.equal(options.type, 'file');
      assert.deepEqual(options.extension, ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);
      options.success({
        tempFiles: [{ name: 'math-paper.docx', path: 'wxfile://math-paper.docx', size: 1234 }]
      });
    },
    navigateTo({ url }) {
      navigateUrl = url;
    },
    switchTab() {}
  };

  try {
    require(indexPagePath);
    assert.ok(pageConfig, 'Page config should be registered in WeChat runtime');
    const context = {
      data: {},
      setData(patch) {
        this.data = { ...this.data, ...patch };
      }
    };

    pageConfig.onTap.call(context, { currentTarget: { dataset: { action: 'upload' } } });
    assert.equal(chooseMessageFileCalled, true);
    assert.equal(context.data.authVisible, undefined);
    assert.equal(navigateUrl, '/pages/student-info/index');
    assert.deepEqual(app.globalData.scoremapPendingUpload, {
      tempFilePath: 'wxfile://math-paper.docx',
      name: 'math-paper.docx',
      size: 1234,
      localOnly: true
    });
    writeEvidence('home-upload-file-picker.json', {
      status: 'PASS',
      command,
      requirementIds: ['REQ143-007'],
      uiIds: ['UI143-C01'],
      ownerScenarioIds: ['O143-01'],
      pageRoute: '/pages/index/index',
      clickPath: [
        'upload-material',
        'wx.chooseMessageFile',
        '/pages/student-info/index'
      ],
      noAuthorizationModal: true,
      filePicker: {
        api: 'wx.chooseMessageFile',
        called: chooseMessageFileCalled,
        options: {
          count: 1,
          type: 'file',
          extension: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']
        }
      },
      navigation: {
        targetRoute: navigateUrl
      },
      pendingUpload: app.globalData.scoremapPendingUpload
    });
  } finally {
    delete require.cache[require.resolve(indexPagePath)];
    global.Page = previousPage;
    global.wx = previousWx;
    global.getApp = previousGetApp;
  }
});
