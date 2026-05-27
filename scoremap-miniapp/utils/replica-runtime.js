const TAB_ROUTES = {
  '/pages/index/index': true,
  '/pages/my/index': true
};

function createReplicaPage(config) {
  const hotspots = config.hotspots || [];
  const cards = config.cards && config.cards.length
    ? config.cards
    : hotspots.map((item) => item.label);

  Page({
    data: {
      reference: '',
      derived: true,
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
      if (!target) return;
      if (target.uploadFlow) {
        beginUploadFlow(target);
        return;
      }
      navigate(target);
    }
  });
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
    showUploadToast('未选择文件');
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
  showUploadToast('已选择，开始分析');
  const fileName = encodeURIComponent(file.name || 'upload');
  const fileType = encodeURIComponent(file.fileType || 'file');
  const separator = String(target.url || '').includes('?') ? '&' : '?';
  navigate(`${target.url}${separator}uploadReady=1&fileType=${fileType}&fileName=${fileName}`);
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

function showUploadToast(title) {
  if (typeof wx !== 'undefined' && wx.showToast) {
    wx.showToast({ title, icon: 'none' });
  }
}

module.exports = { createReplicaPage };
