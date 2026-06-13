const STORAGE_KEY = 'scoremap.wechat.auth';
const api = require('../services/api');
const storage = require('./storage');

function getRuntimeWx() {
  return typeof wx !== 'undefined' ? wx : null;
}

function getRuntimeApp() {
  return typeof getApp === 'function' ? getApp() : null;
}

function readWechatAuth(options = {}) {
  const wxApi = options.wxApi || getRuntimeWx();
  const app = options.app || getRuntimeApp();
  const appAuth = app && app.globalData && app.globalData.scoremapWechatAuth;
  if (appAuth && appAuth.loggedIn) return appAuth;
  if (!wxApi || typeof wxApi.getStorageSync !== 'function') return null;
  try {
    const token = storage.getToken();
    const user = storage.getUser();
    if (token && user) {
      return { loggedIn: true, provider: 'wechat', token, user, source: 'storage-token' };
    }
    const stored = wxApi.getStorageSync(STORAGE_KEY);
    return stored && stored.loggedIn ? stored : null;
  } catch {
    return null;
  }
}

function hasWechatLogin(options = {}) {
  return Boolean(readWechatAuth(options));
}

function writeWechatAuth(auth, options = {}) {
  const wxApi = options.wxApi || getRuntimeWx();
  const app = options.app || getRuntimeApp();
  if (app && app.globalData) {
    app.globalData.scoremapWechatAuth = auth;
  }
  if (wxApi && typeof wxApi.setStorageSync === 'function') {
    try {
      wxApi.setStorageSync(STORAGE_KEY, auth);
    } catch {
      // Storage can fail in restricted DevTools modes; app.globalData still carries the session.
    }
  }
  return auth;
}

function ensureWechatLogin(options = {}) {
  const existing = readWechatAuth(options);
  if (existing) {
    return Promise.resolve({ status: 'WECHAT_LOGIN_READY', auth: existing, reused: true });
  }

  const wxApi = options.wxApi || getRuntimeWx();
  if (!wxApi || typeof wxApi.login !== 'function' || typeof wxApi.request !== 'function') {
    return Promise.reject(new Error('WECHAT_LOGIN_REQUIRED'));
  }

  return new Promise((resolve, reject) => {
    wxApi.login({
      async success(result = {}) {
        if (!result.code) {
          reject(new Error('WECHAT_LOGIN_NO_CODE'));
          return;
        }
        try {
          const data = await api.loginWechat({
            code: result.code,
            userInfo: options.userInfo || {}
          });
          const auth = writeWechatAuth({
            ...createAuthRecord({ code: result.code, source: options.source || 'wx.login' }),
            token: data.token,
            user: data.user,
            localOnly: false
          }, options);
          resolve({ status: 'WECHAT_LOGIN_READY', auth, reused: false });
        } catch (error) {
          reject(error);
        }
      },
      fail(error = {}) {
        reject(new Error(error.errMsg || error.message || 'WECHAT_LOGIN_FAILED'));
      }
    });
  });
}

function createAuthRecord({ code, source }) {
  return {
    loggedIn: true,
    provider: 'wechat',
    code,
    source,
    loginAt: new Date().toISOString(),
    localOnly: true
  };
}

function createWechatAuthGate(initial = {}) {
  let auth = initial.loggedIn === false ? null : createAuthRecord({
    code: initial.code || 'test-wechat-code',
    source: initial.source || 'test-auth-gate'
  });
  return {
    isLoggedIn() {
      return Boolean(auth && auth.loggedIn);
    },
    login(source = 'test-auth-gate-login') {
      auth = createAuthRecord({ code: 'test-wechat-code', source });
      return { status: 'WECHAT_LOGIN_READY', auth };
    },
    read() {
      return auth ? { ...auth } : null;
    },
    logout() {
      auth = null;
      return { status: 'WECHAT_LOGGED_OUT' };
    }
  };
}

module.exports = {
  STORAGE_KEY,
  createWechatAuthGate,
  ensureWechatLogin,
  hasWechatLogin,
  readWechatAuth,
  writeWechatAuth
};
