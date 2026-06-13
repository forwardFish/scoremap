const storage = require('./storage');

const DEFAULT_LOGIN_MESSAGE = '请先完成微信登录后再继续';
const LOGIN_ROUTE = '/pages/login/login';
const DEFAULT_REDIRECT = '/pages/my/index';

function getWx(options = {}) {
  return options.wxApi || (typeof wx !== 'undefined' ? wx : null);
}

function isLoggedIn() {
  return Boolean(storage.getToken());
}

function clearLogin() {
  storage.clearLogin();
}

function currentPageUrl() {
  if (typeof getCurrentPages !== 'function') return '';
  const pages = getCurrentPages();
  const page = pages && pages[pages.length - 1];
  if (!page || !page.route) return '';
  const route = page.route.startsWith('/') ? page.route : `/${page.route}`;
  const query = page.options ? buildQuery(page.options) : '';
  return query ? `${route}?${query}` : route;
}

function normalizeRedirectUrl(value = '') {
  const url = safeDecode(String(value || '').trim());
  if (!url || !url.startsWith('/pages/')) return DEFAULT_REDIRECT;
  if (url.startsWith(LOGIN_ROUTE)) return DEFAULT_REDIRECT;
  return url;
}

function loginUrl(redirectUrl = '') {
  const redirect = normalizeRedirectUrl(redirectUrl || currentPageUrl() || DEFAULT_REDIRECT);
  return `${LOGIN_ROUTE}?redirect=${encodeURIComponent(redirect)}`;
}

function requireLogin(options = {}) {
  if (isLoggedIn()) return true;
  const wxApi = getWx(options);
  const message = options.message || DEFAULT_LOGIN_MESSAGE;
  if (wxApi && typeof wxApi.showToast === 'function') {
    wxApi.showToast({ title: message, icon: 'none', duration: 1200 });
  }
  if (wxApi && typeof wxApi.navigateTo === 'function') {
    wxApi.navigateTo({
      url: loginUrl(options.redirectUrl),
      fail() {
        if (typeof wxApi.redirectTo === 'function') {
          wxApi.redirectTo({ url: loginUrl(options.redirectUrl) });
        }
      }
    });
  }
  return false;
}

function buildQuery(options = {}) {
  return Object.keys(options)
    .filter((key) => options[key] !== undefined && options[key] !== null && options[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
    .join('&');
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

module.exports = {
  DEFAULT_LOGIN_MESSAGE,
  LOGIN_ROUTE,
  clearLogin,
  isLoggedIn,
  loginUrl,
  normalizeRedirectUrl,
  requireLogin
};
