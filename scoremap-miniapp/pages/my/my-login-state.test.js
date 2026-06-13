const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createMiniappApiClient } = require('../../services/api-client');
const api = require('../../services/api');
const auth = require('../../utils/auth');
const { shouldRequireLogin } = require('../../utils/replica-runtime');
const storage = require('../../utils/storage');
const { isLocalBypassToken } = storage;
const { createBasicPayPageState } = require('../basic-pay');
const { createFeedbackPageState } = require('../feedback');
const { createFullReportEntryPageState } = require('../full-report-entry');
const { createFullReportPageState } = require('../full-report');
const { createFullUnlockPageState } = require('../full-unlock');
const { createMyPageState } = require('./index');
const { createOrdersPageState } = require('../orders');
const { createPreviewPageState } = require('../preview');
const { createReportsPageState } = require('../reports');

test('my page exposes guest state and gates identity resources before WeChat login', () => {
  const client = createMiniappApiClient();
  const page = createMyPageState(client, { loggedIn: false });
  const state = page.getState();
  const summary = page.loadSummary();
  const reports = page.openReports();
  const orders = page.openOrders();
  const feedback = page.openFeedback();
  const freeExperience = page.newAnalysis();

  assert.equal(state.isLoggedIn, false);
  assert.equal(state.profile.nickname, '未登录');
  assert.equal(state.profile.loginStateText, '未登录');
  assert.equal(state.recentReports.length, 0);
  assert.deepEqual(state.quickEntries.map((item) => item.id), ['login', 'new-analysis']);
  assert.equal(summary.status, 'LOGIN_REQUIRED');
  assert.equal(reports.targetRoute, '/pages/login/login');
  assert.equal(orders.status, 'LOGIN_REQUIRED');
  assert.equal(feedback.toast, '请先完成微信登录后再继续');
  assert.equal(freeExperience.targetRoute, '/pages/index/index');
  assert.equal(client.calls.length, 0);
});

test('shared login gate classifies protected miniapp actions and rejects local bypass tokens', () => {
  assert.equal(shouldRequireLogin('upload'), true);
  assert.equal(shouldRequireLogin('pay'), true);
  assert.equal(shouldRequireLogin('save'), true);
  assert.equal(shouldRequireLogin('home'), false);
  assert.equal(shouldRequireLogin('pay', { public: true }), false);
  assert.equal(isLocalBypassToken('local-token'), true);
  assert.equal(isLocalBypassToken('mock-user-token'), true);
  assert.equal(isLocalBypassToken('real.jwt.signature'), false);
});

test('requireLogin uses the unified WeChat-login redirect and toast contract', () => {
  const calls = [];
  const wxApi = {
    showToast(input) {
      calls.push({ type: 'toast', input });
    },
    navigateTo(input) {
      calls.push({ type: 'navigateTo', input });
    }
  };

  const allowed = auth.requireLogin({
    wxApi,
    redirectUrl: '/pages/preview/index?orderId=order-t09-preview'
  });

  assert.equal(allowed, false);
  assert.equal(calls[0].type, 'toast');
  assert.equal(calls[0].input.title, '请先完成微信登录后再继续');
  assert.equal(calls[1].type, 'navigateTo');
  assert.equal(
    calls[1].input.url,
    '/pages/login/login?redirect=%2Fpages%2Fpreview%2Findex%3ForderId%3Dorder-t09-preview'
  );
});

test('real API auth stores token/user and clears both on 401', async () => {
  const store = new Map();
  const requests = [];
  global.wx = {
    getStorageSync(key) {
      return store.get(key);
    },
    setStorageSync(key, value) {
      store.set(key, value);
    },
    removeStorageSync(key) {
      store.delete(key);
    },
    request(options) {
      requests.push(options);
      if (options.url.endsWith('/api/auth/wechat-login')) {
        options.success({
          statusCode: 200,
          data: {
            token: 'real.jwt.signature',
            user: { id: 'user-real', nickname: 'Scoremap Parent' }
          }
        });
        return;
      }
      options.success({ statusCode: 401, data: { message: 'token expired' } });
    }
  };

  try {
    const login = await api.loginWechat({
      code: 'wx-real-code',
      userInfo: { nickName: 'Scoremap Parent' }
    });
    assert.equal(login.token, 'real.jwt.signature');
    assert.equal(storage.getToken(), 'real.jwt.signature');
    assert.equal(storage.getUser().id, 'user-real');
    assert.deepEqual(requests[0].data, {
      code: 'wx-real-code',
      userInfo: { nickName: 'Scoremap Parent' }
    });
    assert.equal(Object.prototype.hasOwnProperty.call(requests[0].data, 'mockOpenid'), false);

    await assert.rejects(
      () => api.getMe(),
      /token expired/
    );
    assert.equal(storage.getToken(), '');
    assert.equal(storage.getUser(), null);
  } finally {
    delete global.wx;
  }
});

test('payment and server identity operations return login gate before API mutation when logged out', () => {
  const client = createMiniappApiClient();
  const preview = createPreviewPageState(client, { loggedIn: false });
  const basicPay = createBasicPayPageState(client, { loggedIn: false });
  const fullUnlock = createFullUnlockPageState(client, { loggedIn: false });
  const reports = createReportsPageState(client, { loggedIn: false });
  const orders = createOrdersPageState(client, { loggedIn: false, mode: 'purchases' });
  const feedback = createFeedbackPageState(client, { loggedIn: false });
  const entry = createFullReportEntryPageState(client, { loggedIn: false });
  const fullReport = createFullReportPageState(client, { loggedIn: false });

  assert.equal(preview.unlockBasic().status, 'LOGIN_REQUIRED');
  assert.equal(preview.backToReports().targetRoute, '/pages/login/login');
  assert.equal(basicPay.confirmBasicPay().status, 'LOGIN_REQUIRED');
  assert.equal(fullUnlock.confirmFullPay().status, 'LOGIN_REQUIRED');
  assert.equal(reports.loadReports().redirectUrl, '/pages/reports/index');
  assert.equal(reports.openReportCard('order-t12-full').targetRoute, '/pages/login/login');
  assert.equal(orders.loadRecords().redirectUrl, '/pages/orders/index?mode=purchases');
  assert.equal(feedback.submitFeedback().status, 'LOGIN_REQUIRED');
  assert.equal(entry.saveReport().redirectUrl, '/pages/full-report-entry/index');
  assert.equal(fullReport.saveReport().targetRoute, '/pages/login/login');
  assert.equal(fullReport.exportPdf().status, 'LOGIN_REQUIRED');
  assert.equal(client.calls.some((call) => /\/save-report|\/export-pdf|\/payments\/create|\/my\/reports$/.test(call.path)), false);
});
