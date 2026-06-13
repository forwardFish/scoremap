const TAB_ROUTES = {
  '/pages/index/index': true,
  '/pages/my/index': true
};

const { requireLogin } = require('./auth');

function createReplicaPage(config) {
  const hotspots = config.hotspots || [];
  const cards = config.cards && config.cards.length
    ? config.cards
    : hotspots.map((item) => item.label);

  Page({
    data: {
      reference: config.renderReference === true ? config.reference || '' : '',
      derived: config.derived !== false,
      imageLoadFailed: false,
      title: config.title || '',
      cards,
      hotspots
    },

    onLoad(query) {
      this.query = query || {};
      hideNativeTabBar();
    },

    onShow() {
      hideNativeTabBar();
    },

    onImageError() {
      this.setData({ imageLoadFailed: true });
    },

    onTap(event) {
      const action = event.currentTarget.dataset.action;
      const target = (config.actions && config.actions[action]) || config.defaultTarget;
      if (!target) return null;
      if (shouldRequireLogin(action, target) && !requireLogin({
        redirectUrl: target.redirectUrl,
        message: target.loginMessage
      })) {
        return null;
      }
      if (target.uploadFlow) {
        beginUploadFlow(target);
        return null;
      }
      if (target.paymentFlow) {
        beginPaymentFlow(target, this.query);
        return null;
      }
      navigate(target);
      return null;
    }
  });
}

function shouldRequireLogin(action, target = {}) {
  if (target.authRequired) return true;
  if (target.public === true) return false;
  return ['upload', 'reports', 'orders', 'purchases', 'feedback', 'pay', 'save', 'download', 'export'].includes(action);
}

function hideNativeTabBar() {
  if (typeof wx !== 'undefined' && wx.hideTabBar) {
    wx.hideTabBar({ animation: false, fail() {} });
  }
}

function navigate(target) {
  if (typeof wx === 'undefined') return;
  const url = target.url || target;
  if (TAB_ROUTES[url]) {
    wx.switchTab({ url, fail: () => wx.reLaunch({ url }) });
    return;
  }
  wx.navigateTo({ url, fail: () => wx.redirectTo({ url }) });
}

function beginUploadFlow(target) {
  if (typeof wx === 'undefined') return;
  if (!wx.chooseMessageFile) {
    navigate(target);
    return;
  }
  wx.chooseMessageFile({
    count: 1,
    type: 'all',
    success(result) {
      const file = result.tempFiles && result.tempFiles[0];
      completeUploadFlow(target, normalizeSelectedFile(file));
    }
  });
}

function completeUploadFlow(target, file) {
  if (!file || !file.tempFilePath) {
    showToast('No file selected');
    return;
  }
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.scoremapPendingUpload = {
      originalName: file.name,
      fileType: file.fileType,
      tempFilePath: file.tempFilePath,
      size: file.size,
      selectedAt: new Date().toISOString(),
      localOnly: true
    };
  }
  showToast('File selected');
  const fileName = encodeURIComponent(file.name || 'upload');
  const fileType = encodeURIComponent(file.fileType || 'file');
  const separator = String(target.url || '').includes('?') ? '&' : '?';
  navigate(`${target.url}${separator}uploadReady=1&fileType=${fileType}&fileName=${fileName}`);
}

async function beginPaymentFlow(target, query = {}) {
  if (typeof wx === 'undefined' || typeof wx.request !== 'function') {
    navigate(target);
    return;
  }
  const app = typeof getApp === 'function' ? getApp() : null;
  const orderId = (query && query.orderId) || (app && app.globalData && app.globalData.scoremapLastOrderId) || target.orderId;
  if (!orderId) {
    showToast('Please finish analysis first');
    navigate(target);
    return;
  }
  try {
    if (wx.showLoading) wx.showLoading({ title: 'Paying...', mask: true });
    const api = require('../services/api');
    const paid = await api.payForReport({ orderId, paymentType: target.paymentType || 'basic' });
    if (app && app.globalData) app.globalData.scoremapLastPayment = paid;
    if (wx.hideLoading) wx.hideLoading();
    navigate(target);
  } catch (error) {
    if (wx.hideLoading) wx.hideLoading();
    showToast(error.message || 'Payment not completed');
  }
}

function normalizeSelectedFile(file) {
  if (!file) return null;
  const tempFilePath = file.tempFilePath || file.path;
  const name = file.name || (tempFilePath ? tempFilePath.split(/[\\/]/).pop() : 'student-upload');
  return {
    tempFilePath,
    name,
    fileType: inferSelectedFileType(name, file.type),
    size: file.size || 0
  };
}

function inferSelectedFileType(name, declaredType) {
  const value = `${declaredType || ''} ${name || ''}`.toLowerCase();
  if (value.includes('pdf') || /\.pdf($|\?)/.test(value)) return 'pdf';
  if (value.includes('image') || /\.(png|jpe?g|webp|gif|bmp)($|\?)/.test(value)) return 'image';
  return 'file';
}

function showToast(title) {
  if (typeof wx !== 'undefined' && wx.showToast) {
    wx.showToast({ title, icon: 'none' });
  }
}

module.exports = { createReplicaPage, shouldRequireLogin };
