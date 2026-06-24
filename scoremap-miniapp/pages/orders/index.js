if (typeof Page === 'function') {
  const { requireLogin } = require('../../utils/auth');

  function navigate(url) {
    if (typeof wx === 'undefined') return;
    wx.switchTab({ url, fail: () => wx.reLaunch({ url }) });
  }

  function currentOrdersUrl(query = {}) {
    return query && query.mode === 'purchases' ? '/pages/orders/index?mode=purchases' : '/pages/orders/index';
  }

  Page({
    data: {
      reference: '',
      derived: true,
      title: '订单记录',
      hotspots: [
        { action: 'my', label: 'My', className: 'bottom-cta' }
      ]
    },
    onLoad(query) {
      this.query = query || {};
      if (query && query.mode === 'purchases') this.setData({ title: '购买记录' });
      if (typeof wx !== 'undefined' && wx.hideTabBar) wx.hideTabBar({ animation: false, fail() {} });
    },
    onShow() {
      if (typeof wx !== 'undefined' && wx.hideTabBar) wx.hideTabBar({ animation: false, fail() {} });
      requireLogin({ redirectUrl: currentOrdersUrl(this.query) });
    },
    onTap(event) {
      if (event.currentTarget.dataset.action === 'my') navigate('/pages/my/index');
    }
  });
} else {
const { createMiniappApiClient } = require('../../services/api-client');
const { seedMyFixtureIfMissing } = require('../my');

const ORDERS_ROUTE = '/pages/orders/index';
const MY_ROUTE = '/pages/my/index';
const LOGIN_ROUTE = '/pages/login/login';

function createOrdersPageState(client = createMiniappApiClient(), options = {}) {
  const loggedIn = options.loggedIn !== false;
  if (loggedIn) seedMyFixtureIfMissing(client);
  const mode = options.mode || 'orders';
  let response = null;

  const page = {
    route: ORDERS_ROUTE,
    title: mode === 'purchases' ? '购买记录' : '订单记录',
    loadRecords() {
      if (!loggedIn) {
        response = { status: 401, body: { items: [] } };
        return loginRequiredResult(currentOrdersUrl({ mode }));
      }
      response = client.request('GET', '/api/my/reports', { source: `orders-page-${mode}`, mode });
      return {
        status: response.status === 200 ? 'ORDER_RECORDS_READY' : 'ORDER_RECORDS_FAILED',
        apiStatus: response.status,
        count: response.body.items.length
      };
    },
    backMy() {
      return {
        status: 'NAVIGATE',
        targetRoute: MY_ROUTE
      };
    },
    getState() {
      if (!response) page.loadRecords();
      const items = response.body.items;
      return {
        route: ORDERS_ROUTE,
        title: page.title,
        mode,
        controls: [
          { id: 'back-my', text: '我的', targetRoute: MY_ROUTE },
          { id: 'load-order-records', text: '刷新记录', api: 'GET /api/my/reports' }
        ],
        records: items.map((item) => ({
          orderId: item.orderId,
          title: item.title,
          status: item.status,
          accessLevel: item.accessLevel,
          paymentStatus: item.paymentStatus,
          paidAmountYuan: item.paidAmountYuan || 0,
          visibleInPurchaseMode: mode === 'purchases' ? item.paymentStatus === 'paid' : true
        })).filter((item) => mode !== 'purchases' || item.visibleInPurchaseMode),
        emptyState: items.length === 0
          ? { visible: true, text: '暂无记录' }
          : { visible: false }
      };
    }
  };

  return page;
}

function loginRequiredResult(redirectUrl) {
  return {
    status: 'LOGIN_REQUIRED',
    loginRequired: true,
    targetRoute: LOGIN_ROUTE,
    redirectUrl,
    toast: '请先完成微信登录后再继续'
  };
}

function currentOrdersUrl(query = {}) {
  return query && query.mode === 'purchases' ? `${ORDERS_ROUTE}?mode=purchases` : ORDERS_ROUTE;
}

module.exports = { MY_ROUTE, ORDERS_ROUTE, createOrdersPageState };

}
