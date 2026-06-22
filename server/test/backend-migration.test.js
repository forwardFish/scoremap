const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createApp } = require('../src/app');
const { CloudBaseMirrorDbAdapter } = require('../src/adapters/cloudbase-db');
const { CloudBaseFileAdapter } = require('../src/adapters/cloudbase-file');
const { amountForPaymentType } = require('../src/adapters/wechat-pay-provider');
const { LocalJsonDbAdapter } = require('../src/db/local-json-db');
const { AuthService } = require('../src/services/auth-service');

function testEnv(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-migration-'));
  return {
    root,
    serverRoot: path.join(root, 'server'),
    nodeEnv: 'development',
    port: 0,
    publicBaseUrl: 'http://127.0.0.1:0',
    requestTimeoutMs: 1000,
    authSecret: 'scoremap-migration-test-secret',
    localDbPath: path.join(root, 'db.json'),
    cloudRootDir: path.join(root, 'local-cloud'),
    exportRootDir: path.join(root, 'exports'),
    dbProvider: 'local',
    fileProvider: 'local',
    cloudbaseEnvId: 'scoremap-cloudbase-test',
    paymentProvider: 'local',
    paymentTestMode: false,
    localMockEnabled: true,
    wechatAppId: 'wx-scoremap-migration',
    wechatAppSecret: 'scoremap-app-secret',
    wechatPayMchId: '',
    wechatPaySerialNo: '',
    wechatPayPrivateKey: '',
    wechatPayMerchantCert: '',
    wechatPayApiV3Key: '',
    wechatPayPlatformCert: '',
    wechatPayNotifyUrl: 'https://scoremap.test/pay/notify',
    wechatPayDescription: 'Scoremap migration test',
    wechatPaySkipNotifySignature: false,
    wechatPayTestAmountCents: 1,
    ...overrides
  };
}

function makeAuth(overrides = {}) {
  const env = testEnv(overrides.env);
  const db = new LocalJsonDbAdapter(env.localDbPath);
  return {
    db,
    env,
    auth: new AuthService({ db, env, ...overrides.auth })
  };
}

async function withApi(callback, envOverrides = {}) {
  const api = createApp({ env: testEnv(envOverrides) });
  const server = api.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    return await callback({ ...api, baseUrl });
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
  return {
    status: response.status,
    body: await response.json()
  };
}

test('/api/me does not expose entitlements when point system is not migrated', async () => {
  await withApi(async ({ baseUrl }) => {
    const login = await requestJson(baseUrl, 'POST', '/api/auth/wechat-login', {
      mockOpenid: 'openid-login-enhancement-owner',
      userInfo: { nickName: 'Login Parent' }
    });
    assert.equal(login.status, 200);

    const auth = { Authorization: `Bearer ${login.body.token}` };
    const me = await requestJson(baseUrl, 'GET', '/api/me', undefined, auth);
    assert.equal(me.status, 200);
    assert.equal(Object.hasOwn(me.body, 'entitlements'), false);

    const products = await requestJson(baseUrl, 'GET', '/api/products');
    assert.equal(products.status, 404);
  });
});

test('wechat login falls back to https code2Session when fetch fails', async () => {
  const { auth, db } = makeAuth({
    auth: {
      fetchImpl: async () => {
        throw new Error('fetch failed');
      },
      httpsJsonImpl: async (url) => {
        assert.equal(url.searchParams.get('appid'), 'wx-scoremap-migration');
        assert.equal(url.searchParams.get('js_code'), 'fallback-code');
        return {
          ok: true,
          status: 200,
          data: {
            openid: 'openid-fallback-owner',
            unionid: 'union-fallback-owner',
            session_key: 'session-fallback-owner'
          }
        };
      }
    }
  });

  const result = await auth.login({
    code: 'fallback-code',
    userInfo: { nickName: 'Fallback Parent' }
  });

  assert.equal(result.firstLogin, true);
  assert.equal(result.user.openid, 'openid-fallback-owner');
  assert.equal(result.user.displayName, 'Fallback Parent');
  assert.equal(db.find('users', (row) => row.openid === 'openid-fallback-owner').length, 1);
  assert.equal(Object.hasOwn(result, 'entitlements'), false);
});

test('wechat login maps common code2Session errors to friendly messages', async () => {
  const invalidCode = makeAuth({
    auth: {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ errcode: 40029, errmsg: 'invalid code' })
      })
    }
  }).auth;
  await assert.rejects(
    () => invalidCode.login({ code: 'bad-code' }),
    { statusCode: 401, code: 'WECHAT_CODE_INVALID', message: /invalid or expired/ }
  );

  const missingResource = makeAuth({
    auth: {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ errcode: 40013, errmsg: 'reource is not found' })
      })
    }
  }).auth;
  await assert.rejects(
    () => missingResource.login({ code: 'missing-resource' }),
    { statusCode: 401, code: 'WECHAT_CODE_INVALID', message: /resource was not found/ }
  );
});

test('payment test mode can force legacy WeChat payment amounts to configured cents', () => {
  assert.equal(amountForPaymentType('basic', { paymentTestMode: true, wechatPayTestAmountCents: 1 }), 1);
  assert.equal(amountForPaymentType('full', { paymentTestMode: true, wechatPayTestAmountCents: 5 }), 5);
  assert.equal(amountForPaymentType('basic', { paymentTestMode: false, wechatPayTestAmountCents: 1 }), 100);
});

test('CloudBase mirror DB keeps local contract and mirrors writes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-cloudbase-db-'));
  const writes = [];
  const fakeTcb = {
    init() {
      return {
        database() {
          return {
            collection(tableName) {
              return {
                doc(id) {
                  return {
                    async set(record) {
                      writes.push({ tableName, id, record });
                    },
                    async get() {
                      return { data: writes.filter((item) => item.tableName === tableName && item.id === id).map((item) => item.record) };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
  const db = new CloudBaseMirrorDbAdapter({
    envId: 'scoremap-test-env',
    localDbPath: path.join(root, 'db.json'),
    tcbFactory: fakeTcb
  });
  const user = db.insert('users', { id: 'user-cloudbase-1', role: 'parent_owner', displayName: 'CloudBase User' });
  assert.equal(db.read('users', user.id).displayName, 'CloudBase User');
  await db.flushPendingWrites();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].tableName, 'users');
  assert.equal((await db.findRemoteById('users', user.id)).displayName, 'CloudBase User');
});

test('CloudBase file adapter keeps local cache and uploads through CloudBase app', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-cloudbase-file-'));
  const uploads = [];
  const fakeTcb = {
    init() {
      return {
        async uploadFile(input) {
          uploads.push(input.cloudPath);
          return { fileID: `cloud://${input.cloudPath}` };
        }
      };
    }
  };
  const db = new CloudBaseMirrorDbAdapter({
    envId: 'scoremap-test-env',
    localDbPath: path.join(root, 'db.json'),
    tcbFactory: fakeTcb
  });
  const file = new CloudBaseFileAdapter({
    envId: 'scoremap-test-env',
    rootDir: path.join(root, 'files'),
    db,
    tcbFactory: fakeTcb
  });
  const record = file.uploadBuffer({
    id: 'upload-cloudbase-1',
    ownerId: 'owner-cloudbase',
    orderId: 'order-cloudbase',
    originalName: 'answer.png',
    mimeType: 'image/png',
    buffer: Buffer.from('cloudbase bytes')
  });
  assert.equal(fs.existsSync(record.storagePath), true);
  await file.flushPendingUploads();
  assert.equal(uploads.length, 1);
  assert.equal(file.downloadFile(record.fileId).buffer.toString(), 'cloudbase bytes');
  assert.equal(db.read('upload_files', record.id).uploadStatus, 'uploaded');
});
