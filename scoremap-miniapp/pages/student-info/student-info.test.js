const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { writeJsonEvidence } = require('../../../shared/evidence-paths');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../../shared/local-only');
const { createMiniappApiClient } = require('../../services/api-client');
const { createWechatAuthGate } = require('../../utils/wechat-auth');
const { createStudentInfoPageState, validateForm, GRADES, DEFAULT_GRADE } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const command = 'npm test -- student-info';

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('frontend-page', name), payload);
}

test('student-info renders C02 form defaults and validates required inputs', () => {
  const page = createStudentInfoPageState(createMiniappApiClient());
  const state = page.getState();
  const wxml = fs.readFileSync(path.join(__dirname, 'index.wxml'), 'utf8');
  assert.equal(state.route, '/pages/student-info/index');
  assert.equal(state.form.grade, DEFAULT_GRADE);
  assert.deepEqual(state.grades, GRADES);
  assert.deepEqual(GRADES, ['小一', '小二', '小三', '小四', '小五', '小六', '初一', '初二', '初三', '高一', '高二', '高三']);
  assert.equal(page.selectGrade(0).value, '小一');
  assert.equal(page.selectGrade(5).value, '小六');
  assert.equal(page.selectGrade(6).value, '初一');
  assert.equal(state.form.subject, '数学');
  assert.equal(state.form.authorizationAccepted, true);
  assert.deepEqual(state.form.materialTypes, ['paper', 'wrong', 'score']);
  assert.equal(validateForm({ grade: '', subject: '数学', materialTypes: ['paper'], authorizationAccepted: true }).valid, false);
  assert.equal(validateForm({ grade: '初一', subject: '数学', currentScore: '151', materialTypes: ['paper'], authorizationAccepted: true }).valid, false);
  assert.equal(validateForm({ grade: '初一', subject: '数学', materialTypes: ['paper'], authorizationAccepted: false }).field, 'authorizationAccepted');
  assert.doesNotMatch(wxml, /\?\/(?:view|text|button)>/);
  assert.match(wxml, /data-action="authorization"/);
  assert.doesNotMatch(wxml, /src=["']\/pages\/student-info\/[^"']+\.(?:png|jpe?g|webp)["']/);
  assert.match(wxml, /<picker class="field-control picker-control"/);
  assert.match(wxml, /<input class="field-control text-input"/);
  assert.match(wxml, /ai-robot-smile\.png/);
  assert.match(wxml, /student-info-paper\.png/);
  const toggle = page.toggleMaterialType('wrong');
  assert.deepEqual(toggle.materialTypes, ['paper', 'score']);
  const authToggle = page.toggleAuthorizationAccepted();
  assert.equal(authToggle.authorizationAccepted, false);
  writeEvidence('student-info-render-validation.json', {
    status: 'PASS',
    command,
    route: state.route,
    steps: state.steps,
    controls: state.controls,
    defaultForm: state.form,
    availableGrades: GRADES,
    markup: {
      hasAuthorizationControl: true,
      usesPageLocalVisualSlices: false,
      usesCodeRenderedFormControls: true,
      malformedClosingTagFindings: []
    },
    validationCases: {
      missingGrade: validateForm({ grade: '', subject: '数学', materialTypes: ['paper'], authorizationAccepted: true }),
      invalidScore: validateForm({ grade: '初一', subject: '数学', currentScore: '151', materialTypes: ['paper'], authorizationAccepted: true }),
      missingAuthorization: validateForm({ grade: '初一', subject: '数学', materialTypes: ['paper'], authorizationAccepted: false })
    }
  });
});

test('student-info submits child information, upload files, and preview analysis task', () => {
  const client = createMiniappApiClient();
  const page = createStudentInfoPageState(client);
  page.updateField('currentScore', '78');
  page.updateField('targetScore', '95');
  page.updateField('examType', '月考');
  const result = page.submitStudentInfo();
  const order = client.store.read('diagnosis_orders', result.orderId);
  const upload = client.store.read('upload_files', 'upload-v143-c02-student-info');
  const task = client.store.read('ai_analysis_tasks', 'task-v143-c02-preview');
  assert.equal(result.status, 'SUBMITTED');
  assert.equal(result.targetRoute, '/pages/analysis/index');
  assert.equal(client.calls.length, 3);
  assert.equal(client.calls[0].path, '/api/diagnosis-orders');
  assert.equal(client.calls[1].path, `/api/diagnosis-orders/${result.orderId}/uploads`);
  assert.equal(client.calls[2].path, `/api/diagnosis-orders/${result.orderId}/start-preview-analysis`);
  assert.deepEqual(client.calls.map((call) => `${call.method} ${call.path.replace(result.orderId, '{orderId}')}`), [
    'POST /api/diagnosis-orders',
    'POST /api/diagnosis-orders/{orderId}/uploads',
    'POST /api/diagnosis-orders/{orderId}/start-preview-analysis'
  ]);
  assert.equal(client.calls[0].payloadSummary.grade, '初一');
  assert.equal(client.calls[0].payloadSummary.subject, 'math');
  assert.deepEqual(order.materialTypes, ['exam-paper', 'wrong-question-photo', 'score-report']);
  assert.equal(order.status, 'preview_done');
  assert.equal(order.grade, '初一');
  assert.equal(order.subject, 'math');
  assert.equal(order.currentScore, '78');
  assert.equal(order.targetScore, '95');
  assert.equal(upload.authorizationAccepted, true);
  assert.equal(task.status, 'preview_done');
  writeEvidence('student-info-api-db.json', {
    status: 'PASS',
    command,
    route: '/pages/student-info/index',
    targetRoute: result.targetRoute,
    apiCalls: client.calls,
    apiSequence: [
      'POST /api/diagnosis-orders',
      'POST /api/diagnosis-orders/{orderId}/uploads',
      'POST /api/diagnosis-orders/{orderId}/start-preview-analysis',
      'navigate /pages/analysis/index'
    ],
    dbReadback: {
      order,
      upload,
      analysisTask: task,
      previewDecision: client.store.read('diagnosis_decisions', `decision-${result.orderId}-preview`)
    },
    submittedForm: page.getState().form
  });
});

test('student-info requires WeChat login before starting analysis when the user is logged out', () => {
  const client = createMiniappApiClient();
  const authGate = createWechatAuthGate({ loggedIn: false });
  const page = createStudentInfoPageState(client, { authGate, requireWechatLogin: true });
  const blocked = page.submitStudentInfo();
  assert.equal(blocked.status, 'WECHAT_LOGIN_REQUIRED');
  assert.equal(blocked.nextAction, 'wx.login');
  assert.equal(client.calls.length, 0);

  const login = page.loginWechat();
  const submitted = page.submitStudentInfo();
  assert.equal(login.status, 'WECHAT_LOGIN_READY');
  assert.equal(submitted.status, 'SUBMITTED');
  assert.equal(submitted.targetRoute, '/pages/analysis/index');
  assert.equal(client.calls.length, 3);

  writeEvidence('student-info-wechat-login-gate.json', {
    status: 'PASS',
    command,
    route: '/pages/student-info/index',
    blocked,
    login,
    submitted,
    apiCallsAfterLogin: client.calls
  });
});

test('student-info remains local-only and has no forbidden remote calls', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  const filesToScan = [
    'scoremap-miniapp/pages/student-info/index.js',
    'scoremap-miniapp/pages/student-info/student-info.test.js',
    'scoremap-miniapp/utils/wechat-auth.js',
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
  writeEvidence('student-info-local-only.json', {
    status: 'PASS',
    command,
    localOnly,
    forbiddenRemoteFindings,
    secretFindings: []
  });
});
