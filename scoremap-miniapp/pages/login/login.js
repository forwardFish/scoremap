const api = require('../../services/api');
const storage = require('../../utils/storage');
const { normalizeRedirectUrl } = require('../../utils/auth');

const DEFAULT_AFTER_LOGIN = '/pages/my/index';
const HOME_PAGE = '/pages/index/index';
const DEFAULT_AVATAR = '/assets/icons/user-avatar-gray.png';
const TAB_ROUTES = {
  '/pages/index/index': true,
  '/pages/my/index': true
};

function maskId(raw = '') {
  const text = String(raw || '').trim();
  return text ? text.slice(-6) : '';
}

function persistLogin(data, userInfo = {}, fallbackId = '') {
  const token = String(data.token || '').trim();
  if (!token) throw new Error('登录失败，请重新登录。');
  const nickname = String(userInfo.nickName || userInfo.nickname || (data.user && data.user.nickname) || '').trim();
  const avatarUrl = userInfo.avatarUrl || (data.user && (data.user.avatarUrl || data.user.avatar)) || DEFAULT_AVATAR;
  storage.setToken(token);
  storage.setUser({
    ...(data.user || {}),
    nickname,
    nickName: nickname,
    avatarUrl,
    avatar: avatarUrl,
    id: (data.user && data.user.id) || maskId(fallbackId) || ''
  });
}

function afterLogin(page) {
  wx.showToast({ title: '登录成功', icon: 'success', duration: 900 });
  const redirectUrl = normalizeRedirectUrl(page.data.redirectUrl || DEFAULT_AFTER_LOGIN);
  setTimeout(() => {
    navigateAfterLogin(redirectUrl || DEFAULT_AFTER_LOGIN);
  }, 300);
}

function navigateAfterLogin(url) {
  if (TAB_ROUTES[url]) {
    wx.switchTab({ url, fail: () => wx.reLaunch({ url }) });
    return;
  }
  wx.redirectTo({
    url,
    fail: () => wx.reLaunch({ url })
  });
}

Page({
  data: {
    agreed: true,
    redirectUrl: DEFAULT_AFTER_LOGIN,
    showTermsPopup: false,
    pendingLoginAfterConsent: false,
    showProfilePopup: false,
    avatarUrl: DEFAULT_AVATAR,
    nickname: '',
    hasChosenAvatar: false,
    profileSubmitting: false
  },

  onLoad(options = {}) {
    const redirectUrl = options.redirect || options.redirectUrl || options.returnUrl || DEFAULT_AFTER_LOGIN;
    this.setData({ redirectUrl: normalizeRedirectUrl(redirectUrl) });
  },

  toggleAgree() {
    const nextAgreed = !this.data.agreed;
    this.setData({
      agreed: nextAgreed,
      showTermsPopup: nextAgreed ? false : this.data.showTermsPopup,
      pendingLoginAfterConsent: nextAgreed ? false : this.data.pendingLoginAfterConsent
    });
  },

  noop() {},

  showTermsPrompt(pendingLoginAfterConsent = false) {
    this.setData({ showTermsPopup: true, pendingLoginAfterConsent });
  },

  agreeTermsAndContinue() {
    const shouldContinueLogin = this.data.pendingLoginAfterConsent;
    this.setData({
      agreed: true,
      showTermsPopup: false,
      pendingLoginAfterConsent: false
    });
    if (shouldContinueLogin) this.setData({ showProfilePopup: true });
  },

  cancelTermsPrompt() {
    this.setData({
      agreed: false,
      showTermsPopup: false,
      pendingLoginAfterConsent: false,
      showProfilePopup: false
    });
    wx.showToast({ title: '已取消登录', icon: 'none', duration: 900 });
    setTimeout(() => {
      wx.reLaunch({ url: HOME_PAGE, fail: () => wx.redirectTo({ url: HOME_PAGE }) });
    }, 260);
  },

  ensureAgreed() {
    if (this.data.agreed) return true;
    this.showTermsPrompt(true);
    return false;
  },

  ensureProfile(nickname = this.data.nickname) {
    if (!this.data.hasChosenAvatar || !this.data.avatarUrl || this.data.avatarUrl === DEFAULT_AVATAR) {
      wx.showToast({ title: '请先选择微信头像', icon: 'none' });
      return false;
    }
    if (!String(nickname || '').trim()) {
      wx.showToast({ title: '请先填写微信昵称', icon: 'none' });
      return false;
    }
    return true;
  },

  onChooseAvatar(event) {
    const avatarUrl = event && event.detail && event.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({ avatarUrl, hasChosenAvatar: true });
  },

  onNicknameInput(event) {
    this.setData({ nickname: event.detail.value });
  },

  closeProfilePopup() {
    if (this.data.profileSubmitting) return;
    this.setData({ showProfilePopup: false });
  },

  login() {
    if (!this.ensureAgreed()) return;
    this.setData({ showProfilePopup: true });
  },

  goHome() {
    wx.reLaunch({ url: HOME_PAGE, fail: () => wx.redirectTo({ url: HOME_PAGE }) });
  },

  confirmProfileLogin(event) {
    const formNickname = event && event.detail && event.detail.value && event.detail.value.nickname;
    const nickname = String(formNickname || this.data.nickname || '').trim();
    if (!this.ensureProfile(nickname)) return;
    const userInfo = { nickName: nickname, avatarUrl: this.data.avatarUrl };
    this.setData({ profileSubmitting: true });
    wx.showLoading({ title: '登录中...' });
    wx.login({
      success: async (loginRes) => {
        try {
          const data = await api.loginWechat({ code: loginRes.code, userInfo });
          persistLogin(data, userInfo, loginRes.code);
          this.setData({ profileSubmitting: false, showProfilePopup: false });
          wx.hideLoading();
          afterLogin(this);
        } catch (error) {
          this.setData({ profileSubmitting: false, showProfilePopup: false });
          wx.hideLoading();
          wx.showToast({ title: error.message || '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ profileSubmitting: false });
        wx.hideLoading();
        wx.showToast({ title: '微信登录失败，请稍后重试', icon: 'none' });
      }
    });
  }
});
