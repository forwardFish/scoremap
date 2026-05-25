App({
  globalData: {
    localOnly: true,
    adapterMode: 'local-mock'
  },
  onLaunch() {
    if (typeof wx !== 'undefined' && wx.hideTabBar) {
      wx.hideTabBar({ animation: false, fail() {} });
    }
  }
});
