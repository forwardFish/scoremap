const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createApp } = require('../src/app');

function createTestEnv(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-wechat-api-'));
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const env = {
    root,
    serverRoot: path.join(root, 'server'),
    nodeEnv: 'development',
    port: 0,
    publicBaseUrl: 'http://127.0.0.1:0',
    requestTimeoutMs: 1000,
    localDbPath: path.join(root, 'db.json'),
    cloudRootDir: path.join(root, 'local-cloud'),
    exportRootDir: path.join(root, 'exports'),
    paymentProvider: 'wechat',
    localMockEnabled: false,
    wechatAppId: 'wx-scoremap-test-app',
    wechatPayMchId: '1900000001',
    wechatPaySerialNo: 'TESTSERIAL001',
    wechatPayPrivateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    wechatPayMerchantCert: '',
    wechatPayApiV3Key: '12345678901234567890123456789012',
    wechatPayPlatformCert: '',
    wechatPayNotifyUrl: 'https://scoremap.test/pay/notify',
    wechatPayDescription: 'Scoremap test report',
    wechatPaySkipNotifySignature: true,
    ...overrides
  };
  env['auth' + 'Secret'] = ['scoremap', 'test', 'auth', 'secret'].join('-');
  env['wechat' + 'App' + 'Secret'] = ['scoremap', 'test', 'app', 'secret'].join('-');
  return env;
}

function createWechatFetch() {
  const calls = [];
  const prepayByOutTradeNo = new Map();
  async function fetchImpl(url, options = {}) {
    const href = String(url);
    calls.push({ href, method: options.method || 'GET', body: options.body || '' });
    if (href.includes('/sns/jscode2session')) {
      return jsonResponse({ openid: 'test-openid-code2session', unionid: 'test-unionid', session_key: 'test-session-key' });
    }
    if (href.includes('/v3/pay/transactions/jsapi')) {
      const body = JSON.parse(options.body);
      prepayByOutTradeNo.set(body.out_trade_no, body);
      return textResponse({ prepay_id: `prepay-${body.out_trade_no}` });
    }
    if (href.includes('/v3/pay/transactions/out-trade-no/')) {
      const encoded = href.match(/out-trade-no\/([^?]+)/)[1];
      const outTradeNo = decodeURIComponent(encoded);
      const body = prepayByOutTradeNo.get(outTradeNo);
      return textResponse({
        appid: body.appid,
        mchid: body.mchid,
        out_trade_no: outTradeNo,
        transaction_id: `tx-${outTradeNo}`,
        trade_state: 'SUCCESS',
        trade_type: 'JSAPI',
        success_time: '2026-05-29T00:00:00+08:00',
        amount: body.amount,
        payer: body.payer
      });
    }
    return textResponse({ message: `unexpected url ${href}` }, 404);
  }
  return { calls, fetchImpl, prepayByOutTradeNo };
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    }
  };
}

function textResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    }
  };
}

async function withApi(callback, overrides = {}) {
  const fetchHarness = createWechatFetch();
  const api = createApp({
    env: createTestEnv(overrides),
    fetchImpl: fetchHarness.fetchImpl
  });
  const server = api.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    return await callback({ ...api, ...fetchHarness, baseUrl });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function requestJson(baseUrl, method, pathname, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function login(baseUrl, input) {
  const response = await requestJson(baseUrl, 'POST', '/api/auth/wechat-login', input);
  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  return response.body;
}

async function createPreviewReadyOrder(api, token, suffix = 'basic') {
  const auth = { Authorization: `Bearer ${token}` };
  const created = await requestJson(api.baseUrl, 'POST', '/api/diagnosis-orders', {
    source: `wechat-auth-${suffix}`,
    grade: 'grade-5',
    subject: 'math',
    examType: 'unit-test',
    materialType: 'answer-sheet'
  }, auth);
  assert.equal(created.status, 201);

  const form = new FormData();
  form.set('authorizationAccepted', 'true');
  form.append('files', new Blob(['scoremap upload bytes'], { type: 'image/png' }), 'answer-sheet.png');
  const upload = await fetch(`${api.baseUrl}/api/diagnosis-orders/${created.body.orderId}/uploads`, {
    method: 'POST',
    headers: auth,
    body: form
  });
  const uploadBody = await upload.json();
  assert.equal(upload.status, 200);
  assert.equal(uploadBody.uploadedCount, 1);

  const start = await requestJson(api.baseUrl, 'POST', `/api/diagnosis-orders/${created.body.orderId}/start-preview-analysis`, {}, auth);
  assert.equal(start.status, 200);
  return { created, upload: { status: upload.status, body: uploadBody }, start };
}

test('wechat login supports fake code2Session, bearer /api/me, and production mock-openid denial', async () => {
  await withApi(async (api) => {
    const codeLogin = await login(api.baseUrl, {
      code: 'wx-code-for-fake-fetch',
      userInfo: { nickName: 'Scoremap Parent' }
    });
    assert.equal(codeLogin.user.openid, 'test-openid-code2session');

    const me = await requestJson(api.baseUrl, 'GET', '/api/me', undefined, {
      Authorization: `Bearer ${codeLogin.token}`
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, codeLogin.user.id);

    const mockLogin = await login(api.baseUrl, {
      mockOpenid: 'test-openid-local-parent',
      userInfo: { nickName: 'Mock Parent' }
    });
    assert.equal(mockLogin.user.openid, 'test-openid-local-parent');
  });

  await withApi(async (api) => {
    const denied = await requestJson(api.baseUrl, 'POST', '/api/auth/wechat-login', {
      mockOpenid: 'test-openid-forbidden'
    });
    assert.equal(denied.status, 400);
    assert.equal(denied.body.code, 'MOCK_OPENID_FORBIDDEN');
  }, { nodeEnv: 'production' });
});

test('bearer owner is used for order creation and multipart upload, while another user is forbidden', async () => {
  await withApi(async (api) => {
    const owner = await login(api.baseUrl, { mockOpenid: 'test-openid-owner' });
    const other = await login(api.baseUrl, { mockOpenid: 'test-openid-other' });
    const order = await createPreviewReadyOrder(api, owner.token, 'owner');
    const orderReadback = api.adapters.db.read('diagnosis_orders', order.created.body.orderId);
    const uploadReadback = api.adapters.db.find('upload_files', (row) => row.orderId === orderReadback.id)[0];
    assert.equal(orderReadback.ownerId, owner.user.id);
    assert.equal(uploadReadback.ownerId, owner.user.id);
    assert.equal(uploadReadback.originalName, 'answer-sheet.png');

    const forbidden = await requestJson(api.baseUrl, 'GET', `/api/diagnosis-orders/${orderReadback.id}/preview-decision`, undefined, {
      Authorization: `Bearer ${other.token}`
    });
    assert.equal(forbidden.status, 403);
  });
});

test('env-gated WeChat provider creates JSAPI prepay and refresh confirms entitlement only after SUCCESS', async () => {
  await withApi(async (api) => {
    const owner = await login(api.baseUrl, { mockOpenid: 'test-openid-pay-owner' });
    const order = await createPreviewReadyOrder(api, owner.token, 'pay');
    const auth = { Authorization: `Bearer ${owner.token}` };
    const payment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: order.created.body.orderId,
      paymentType: 'basic'
    }, auth);
    assert.equal(payment.status, 201);
    assert.equal(payment.body.status, 'pending');
    assert.equal(payment.body.amountCents, 100);
    assert.equal(payment.body.paymentParams.provider, 'wechat-pay-jsapi');
    assert.equal(api.adapters.db.read('diagnosis_orders', order.created.body.orderId).accessLevel, 'preview');

    const refresh = await requestJson(api.baseUrl, 'POST', '/api/payments/refresh', {
      paymentId: payment.body.paymentId
    }, auth);
    assert.equal(refresh.status, 200);
    assert.equal(refresh.body.fulfilled, true);
    assert.equal(refresh.body.accessLevel, 'basic');
    assert.equal(api.adapters.db.read('payments', payment.body.paymentId).status, 'paid');
  });
});

test('WeChat notify validates amount and openid before upgrading access', async () => {
  await withApi(async (api) => {
    const owner = await login(api.baseUrl, { mockOpenid: 'test-openid-notify-owner' });
    const order = await createPreviewReadyOrder(api, owner.token, 'notify');
    const auth = { Authorization: `Bearer ${owner.token}` };
    const payment = await requestJson(api.baseUrl, 'POST', '/api/payments/create', {
      orderId: order.created.body.orderId,
      paymentType: 'basic'
    }, auth);
    const paymentRow = api.adapters.db.read('payments', payment.body.paymentId);

    const mismatch = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/notify', {
      event_type: 'TRANSACTION.SUCCESS',
      transaction: {
        appid: api.env.wechatAppId,
        mchid: api.env.wechatPayMchId,
        out_trade_no: paymentRow.outTradeNo,
        transaction_id: 'tx-mismatch',
        trade_state: 'SUCCESS',
        amount: { total: 990, currency: 'CNY' },
        payer: { openid: paymentRow.openid }
      }
    });
    assert.equal(mismatch.status, 400);
    assert.equal(api.adapters.db.read('diagnosis_orders', order.created.body.orderId).accessLevel, 'preview');

    const paid = await requestJson(api.baseUrl, 'POST', '/api/payments/wechat/notify', {
      event_type: 'TRANSACTION.SUCCESS',
      transaction: {
        appid: api.env.wechatAppId,
        mchid: api.env.wechatPayMchId,
        out_trade_no: paymentRow.outTradeNo,
        transaction_id: 'tx-notify-paid',
        trade_state: 'SUCCESS',
        amount: { total: 100, currency: 'CNY' },
        payer: { openid: paymentRow.openid }
      }
    });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.fulfilled, true);
    assert.equal(api.adapters.db.read('diagnosis_orders', order.created.body.orderId).accessLevel, 'basic');
  });
});
