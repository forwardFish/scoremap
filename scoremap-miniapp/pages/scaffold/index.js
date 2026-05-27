if (typeof Page === 'function') {
  Page({
    data: {
      reference: '',
      derived: true,
      title: 'Scoremap Local Scaffold',
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
    title: 'Scoremap Local Scaffold',
    status: 'ready',
    controls: [
      {
        id: 'start-local-check',
        target: '/api/scaffold/ping',
        expected: 'API call returns local adapter status.'
      },
      {
        id: 'readback-local-db',
        target: '/api/scaffold/db-readback',
        expected: 'API call mutates and reads back diagnosis_orders locally.'
      }
    ],
    apiContracts: SCAFFOLD_API_CONTRACTS
  };
}

module.exports = { createScaffoldPageState };

}
