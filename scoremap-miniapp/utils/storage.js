const KEYS = {
  TOKEN: 'scoremap.auth.token',
  USER: 'scoremap.auth.user',
  ORDER_TOKEN: 'scoremap.order.token'
};

function getWx() {
  return typeof wx !== 'undefined' ? wx : null;
}

function getToken() {
  const wxApi = getWx();
  if (!wxApi || typeof wxApi.getStorageSync !== 'function') return '';
  const token = wxApi.getStorageSync(KEYS.TOKEN) || '';
  if (isLocalBypassToken(token)) {
    clearToken();
    return '';
  }
  return token;
}

function setToken(token) {
  const wxApi = getWx();
  if (wxApi && typeof wxApi.setStorageSync === 'function') {
    wxApi.setStorageSync(KEYS.TOKEN, token || '');
  }
}

function clearToken() {
  const wxApi = getWx();
  if (wxApi && typeof wxApi.removeStorageSync === 'function') {
    wxApi.removeStorageSync(KEYS.TOKEN);
  }
}

function getUser() {
  const wxApi = getWx();
  if (!wxApi || typeof wxApi.getStorageSync !== 'function') return null;
  return wxApi.getStorageSync(KEYS.USER) || null;
}

function setUser(user) {
  const wxApi = getWx();
  if (wxApi && typeof wxApi.setStorageSync === 'function') {
    wxApi.setStorageSync(KEYS.USER, user || null);
  }
}

function clearUser() {
  const wxApi = getWx();
  if (wxApi && typeof wxApi.removeStorageSync === 'function') {
    wxApi.removeStorageSync(KEYS.USER);
  } else if (wxApi && typeof wxApi.setStorageSync === 'function') {
    wxApi.setStorageSync(KEYS.USER, null);
  }
}

function clearLogin() {
  clearToken();
  clearUser();
}

function getOrderToken(orderId) {
  const wxApi = getWx();
  if (!wxApi || typeof wxApi.getStorageSync !== 'function') return '';
  const tokens = wxApi.getStorageSync(KEYS.ORDER_TOKEN) || {};
  return tokens[orderId] || '';
}

function setOrderToken(orderId, token) {
  const wxApi = getWx();
  if (!wxApi || typeof wxApi.setStorageSync !== 'function' || !orderId || !token) return;
  const tokens = wxApi.getStorageSync(KEYS.ORDER_TOKEN) || {};
  wxApi.setStorageSync(KEYS.ORDER_TOKEN, { ...tokens, [orderId]: token });
}

function isLocalBypassToken(token) {
  const value = String(token || '');
  return value === 'local-token' || value === 'mock-token' || value.startsWith('local-') || value.startsWith('mock-');
}

module.exports = {
  KEYS,
  clearLogin,
  clearToken,
  clearUser,
  getOrderToken,
  getToken,
  getUser,
  isLocalBypassToken,
  setOrderToken,
  setToken,
  setUser
};
