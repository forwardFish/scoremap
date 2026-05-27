if (typeof App === 'function') {
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
} else {
const { SCAFFOLD_ROUTES } = require('../shared/scaffold-contract');
const { MINIAPP_ROUTES, TAB_BAR } = require('./routes');

function createMiniappScaffold() {
  return {
    localOnly: true,
    routes: SCAFFOLD_ROUTES,
    launchRoute: '/pages/scaffold/index'
  };
}

function createMiniappShell() {
  return {
    taskId: 'T06',
    localOnly: true,
    adapterMode: 'local-mock',
    launchRoute: '/pages/index/index',
    routes: MINIAPP_ROUTES,
    tabBar: TAB_BAR,
    apiBaseUrl: 'local-mock://scoremap',
    forbiddenRemoteCalls: []
  };
}

module.exports = { createMiniappScaffold, createMiniappShell };
}
