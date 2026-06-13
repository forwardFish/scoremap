const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const api = require('../../services/api');
const config = require('../../utils/config');
const storage = require('../../utils/storage');
const { createApp } = require('../../../server/src/app');

function createEnv(root) {
  return {
    root,
    serverRoot: path.join(root, 'server'),
    nodeEnv: 'development',
    port: 0,
    publicBaseUrl: 'http://127.0.0.1:0',
    requestTimeoutMs: 1000,
    authSecret: 'local-mock-login-flow',
    localDbPath: path.join(root, 'db.json'),
    cloudRootDir: path.join(root, 'local-cloud'),
    exportRootDir: path.join(root, 'exports'),
    paymentProvider: 'local',
    localMockEnabled: true,
    wechatAppId: 'wx-scoremap-login-flow',
    wechatAppSecret: 'local-mock-app'
  };
}

async function withApi(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-login-flow-'));
  const apiApp = createApp({
    env: createEnv(root),
    fetchImpl: async (url) => {
      assert.match(String(url), /jscode2session/);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            openid: `openid-${crypto.randomBytes(4).toString('hex')}`,
            unionid: 'unionid-scoremap-login-flow',
            session_key: 'session-key-scoremap-login-flow'
          };
        }
      };
    }
  });
  const server = apiApp.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await callback({ ...apiApp, baseUrl });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    try {
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (error) {
      if (error.code !== 'EPERM') throw error;
    }
  }
}

test('login page completes wx.login, backend token exchange, profile storage, /api/me, and redirect', async () => {
  await withApi(async ({ baseUrl }) => {
    const originalBaseUrl = config.API_BASE_URL;
    config.API_BASE_URL = baseUrl;

    const storageMap = new Map();
    const calls = [];
    let pageConfig = null;

    global.Page = (definition) => {
      pageConfig = definition;
    };
    global.wx = {
      getStorageSync(key) {
        return storageMap.get(key);
      },
      setStorageSync(key, value) {
        storageMap.set(key, value);
      },
      removeStorageSync(key) {
        storageMap.delete(key);
      },
      showToast(input) {
        calls.push({ type: 'toast', input });
      },
      showLoading(input) {
        calls.push({ type: 'showLoading', input });
      },
      hideLoading() {
        calls.push({ type: 'hideLoading' });
      },
      login(input) {
        calls.push({ type: 'wx.login' });
        input.success({ code: 'wx-login-flow-code' });
      },
      switchTab(input) {
        calls.push({ type: 'switchTab', input });
        if (typeof input.success === 'function') input.success();
      },
      redirectTo(input) {
        calls.push({ type: 'redirectTo', input });
      },
      reLaunch(input) {
        calls.push({ type: 'reLaunch', input });
      },
      request(input) {
        calls.push({ type: 'request', url: input.url, method: input.method, data: input.data });
        fetch(input.url, {
          method: input.method || 'GET',
          headers: input.header || {},
          body: input.data === undefined ? undefined : JSON.stringify(input.data)
        })
          .then(async (response) => {
            input.success({
              statusCode: response.status,
              data: await response.json()
            });
          })
          .catch((error) => input.fail(error));
      }
    };

    try {
      delete require.cache[require.resolve('./login')];
      require('./login');
      assert.ok(pageConfig);

      const page = {
        ...pageConfig,
        data: { ...pageConfig.data },
        setData(patch) {
          this.data = { ...this.data, ...patch };
        }
      };

      page.onLoad({ redirect: '/pages/my/index' });
      page.agreeTermsAndContinue();
      page.onChooseAvatar({ detail: { avatarUrl: 'https://example.test/avatar.png' } });
      page.onNicknameInput({ detail: { value: 'Scoremap Parent' } });
      page.confirmProfileLogin({ detail: { value: { nickname: 'Scoremap Parent' } } });

      await waitFor(() => calls.some((call) => call.type === 'switchTab'));

      const token = storage.getToken();
      const user = storage.getUser();
      assert.ok(token);
      assert.equal(user.nickname, 'Scoremap Parent');
      assert.equal(user.avatarUrl, 'https://example.test/avatar.png');
      assert.equal(calls.find((call) => call.type === 'request').data.code, 'wx-login-flow-code');
      assert.equal(calls.find((call) => call.type === 'switchTab').input.url, '/pages/my/index');

      const me = await api.getMe();
      assert.equal(me.user.id, user.id);
      assert.equal(me.user.nickname, 'Scoremap Parent');
    } finally {
      config.API_BASE_URL = originalBaseUrl;
      delete global.Page;
      delete global.wx;
    }
  });
});

test('local DevTools config disables urlCheck for 127.0.0.1 login API smoke tests', () => {
  const privateConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'project.private.config.json'), 'utf8'));
  assert.equal(privateConfig.setting.urlCheck, false);
});

function waitFor(predicate) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - started > 2000) {
        reject(new Error('Timed out waiting for login flow.'));
        return;
      }
      setTimeout(tick, 20);
    };
    tick();
  });
}
