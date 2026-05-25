if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "订单记录",
  "reference": "",
  "derived": true,
  "hotspots": [
    {
      "action": "my",
      "label": "我的",
      "className": "bottom-cta"
    }
  ],
  "actions": {
    "my": {
      "url": "/pages/my/index"
    }
  },
  "cards": [
    "1 元初判订单",
    "9.9 元完整报告订单"
  ]
});
} else {
const { createMiniappApiClient } = require('../../services/api-client');
const { seedMyFixtureIfMissing } = require('../my');

const ORDERS_ROUTE = '/pages/orders/index';
const MY_ROUTE = '/pages/my/index';

function createOrdersPageState(client = createMiniappApiClient(), options = {}) {
  seedMyFixtureIfMissing(client);
  const mode = options.mode || 'orders';
  let response = null;

  const page = {
    route: ORDERS_ROUTE,
    title: mode === 'purchases' ? '购买记录' : '订单记录',
    loadRecords() {
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
          { id: 'back-my', text: 'My', targetRoute: MY_ROUTE },
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

module.exports = { MY_ROUTE, ORDERS_ROUTE, createOrdersPageState };

}
