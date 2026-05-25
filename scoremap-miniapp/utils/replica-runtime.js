const TAB_ROUTES = {
  '/pages/index/index': true,
  '/pages/my/index': true
};

function createReplicaPage(config) {
  Page({
    data: {
      reference: config.reference,
      derived: Boolean(config.derived),
      imageLoadFailed: false,
      title: config.title || '',
      cards: config.cards && config.cards.length
        ? config.cards
        : (config.hotspots || []).map((item) => item.label),
      hotspots: config.hotspots || []
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

module.exports = { createReplicaPage };
