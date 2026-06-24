if (typeof Page === 'function') {
  Page({
    data: {
      reference: '',
      derived: true,
      title: 'Scoremap 本地脚手架',
      hotspots: [
        { action: 'home', label: '进入首页', className: 'bottom-cta' }
      ]
    },
    onLoad(query) {
      this.query = query || {};
      if (typeof wx !== 'undefined' && wx.hideTabBar) wx.hideTabBar({ animation: false, fail() {} });
    },
    onShow() {
      if (typeof wx !== 'undefined' && wx.hideTabBar) wx.hideTabBar({ animation: false, fail() {} });
    },
    onTap(event) {
      if (event.currentTarget.dataset.action !== 'home' || typeof wx === 'undefined') return;
      wx.switchTab({ url: '/pages/index/index', fail: () => wx.reLaunch({ url: '/pages/index/index' }) });
    }
  });
} else {
const { SCAFFOLD_API_CONTRACTS } = require('../../../shared/scaffold-contract');

function createScaffoldPageState() {
  return {
    route: '/pages/scaffold/index',
    title: 'Scoremap 本地脚手架',
    status: 'ready',
    controls: [
      {
        id: 'start-local-check',
        target: '/api/scaffold/ping',
        expected: 'API 调用返回本地适配器状态。'
      },
      {
        id: 'readback-local-db',
        target: '/api/scaffold/db-readback',
        expected: 'API 调用会在本地写入并回读 diagnosis_orders。'
      }
    ],
    apiContracts: SCAFFOLD_API_CONTRACTS
  };
}

module.exports = { createScaffoldPageState };

}
