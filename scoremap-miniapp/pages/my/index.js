if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "我的",
  "reference": "/assets/reference/my.jpg",
  "derived": false,
  "hotspots": [
    {
      "action": "reports",
      "label": "我的报告",
      "className": "my-reports"
    },
    {
      "action": "orders",
      "label": "订单记录",
      "className": "my-orders"
    },
    {
      "action": "feedback",
      "label": "帮助与反馈",
      "className": "my-feedback"
    },
    {
      "action": "new",
      "label": "继续新建分析",
      "className": "my-new"
    },
    {
      "action": "home",
      "label": "首页",
      "className": "tab-home"
    }
  ],
  "actions": {
    "reports": {
      "url": "/pages/reports/index"
    },
    "orders": {
      "url": "/pages/orders/index"
    },
    "feedback": {
      "url": "/pages/feedback/index"
    },
    "new": {
      "url": "/pages/index/index"
    },
    "home": {
      "url": "/pages/index/index"
    }
  },
  "cards": []
});
} else {
const { createMiniappApiClient } = require('../../services/api-client');

const MY_ROUTE = '/pages/my/index';
const REPORTS_ROUTE = '/pages/reports/index';
const ORDERS_ROUTE = '/pages/orders/index';
const FEEDBACK_ROUTE = '/pages/feedback/index';
const INDEX_ROUTE = '/pages/index/index';

function createMyPageState(client = createMiniappApiClient(), options = {}) {
  const userId = options.userId || 'local-user-scoremap-t06';
  let reportsResponse = null;

  seedMyFixtureIfMissing(client);

  const page = {
    route: MY_ROUTE,
    tab: 'my',
    uiReference: {
      png: 'docs/UI/小程序/我的.png',
      stitch: 'docs/UI/小程序/stitch_codex_development_blueprints/_1/screen.png'
    },
    title: '我的',
    loadSummary() {
      reportsResponse = client.request('GET', '/api/my/reports', { source: 'my-page-summary' });
      const items = reportsResponse.body.items;
      return {
        status: reportsResponse.status === 200 ? 'MY_REPORTS_READY' : 'MY_REPORTS_FAILED',
        apiStatus: reportsResponse.status,
        reportCount: items.length,
        generatedCount: items.filter((item) => ['basic', 'full'].includes(item.accessLevel)).length,
        analyzingCount: items.filter((item) => ['uploaded', 'analyzing'].includes(item.status)).length,
        needMaterialCount: items.filter((item) => item.status === 'need_more_material').length
      };
    },
    openReports() {
      return { status: 'NAVIGATE', targetRoute: REPORTS_ROUTE };
    },
    openOrders() {
      return { status: 'NAVIGATE', targetRoute: ORDERS_ROUTE, filter: 'orders' };
    },
    openPurchases() {
      return { status: 'NAVIGATE', targetRoute: ORDERS_ROUTE, filter: 'purchases' };
    },
    openFeedback() {
      return { status: 'NAVIGATE', targetRoute: FEEDBACK_ROUTE, query: { orderId: options.feedbackOrderId || 'order-t12-full' } };
    },
    newAnalysis() {
      return { status: 'SWITCH_TAB', targetRoute: INDEX_ROUTE };
    },
    copyUserId() {
      return { status: 'COPIED', toast: '本地用户 ID 已复制', userId };
    },
    getState() {
      if (!reportsResponse) page.loadSummary();
      const items = reportsResponse.body.items;
      const summary = page.loadSummary();
      return {
        route: MY_ROUTE,
        title: page.title,
        tab: page.tab,
        uiReference: page.uiReference,
        profile: {
          avatarText: '家长',
          nickname: '匿名家长',
          userId,
          copyControl: { id: 'copy-user-id', text: '复制 ID' }
        },
        rightsCard: {
          title: '我的权益',
          subtitle: '已购报告权益 / 内测体验权益',
          proTreatment: 'MVP placeholder only; no subscription, renewal, or real membership purchase is exposed.'
        },
        stats: [
          { id: 'generated-reports', label: '已生成报告', value: summary.generatedCount },
          { id: 'analyzing', label: '分析中', value: summary.analyzingCount },
          { id: 'need-material', label: '待补资料', value: summary.needMaterialCount }
        ],
        recentReports: items.slice(0, 2),
        quickEntries: [
          { id: 'open-reports', text: '我的报告', targetRoute: REPORTS_ROUTE },
          { id: 'open-orders', text: '订单记录', targetRoute: ORDERS_ROUTE },
          { id: 'open-purchases', text: '购买记录', targetRoute: ORDERS_ROUTE },
          { id: 'open-feedback', text: '帮助与反馈', targetRoute: FEEDBACK_ROUTE }
        ],
        controls: [
          { id: 'load-my-reports', text: '刷新我的报告', api: 'GET /api/my/reports' },
          { id: 'copy-user-id', text: '复制 ID', toast: '本地用户 ID 已复制' },
          { id: 'open-reports', text: '我的报告', targetRoute: REPORTS_ROUTE },
          { id: 'open-orders', text: '订单记录', targetRoute: ORDERS_ROUTE },
          { id: 'open-purchases', text: '购买记录', targetRoute: ORDERS_ROUTE },
          { id: 'open-feedback', text: '帮助与反馈', targetRoute: FEEDBACK_ROUTE },
          { id: 'new-analysis', text: '继续新建分析', targetRoute: INDEX_ROUTE }
        ],
        bottomTabs: [
          { id: 'home', text: '首页', targetRoute: INDEX_ROUTE, active: false },
          { id: 'my', text: '我的', targetRoute: MY_ROUTE, active: true }
        ]
      };
    }
  };

  return page;
}

function seedMyFixtureIfMissing(client) {
  if (client.store.list('diagnosis_orders').length > 0) return;
  client.store.upsert('diagnosis_orders', {
    id: 'order-t12-full',
    ownerId: 'local-user-scoremap-t06',
    title: '五年级数学单元测验完整报告',
    grade: '五年级',
    subject: '数学',
    examType: '单元测验',
    status: 'full_done',
    accessLevel: 'full',
    savedReport: true,
    createdAt: '2026-05-22T10:00:00Z',
    source: 'T12-my-reports-fixture'
  });
  client.store.upsert('payments', {
    id: 'payment-t12-basic',
    orderId: 'order-t12-full',
    ownerId: 'local-user-scoremap-t06',
    paymentType: 'basic',
    amountYuan: 1,
    status: 'paid',
    adapter: 'local-wechat-pay-mock'
  });
  client.store.upsert('payments', {
    id: 'payment-t12-full',
    orderId: 'order-t12-full',
    ownerId: 'local-user-scoremap-t06',
    paymentType: 'full',
    amountYuan: 9.9,
    status: 'paid',
    adapter: 'local-wechat-pay-mock'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-t12-analyzing',
    ownerId: 'local-user-scoremap-t06',
    title: '分析中的数学资料',
    grade: '五年级',
    subject: '数学',
    examType: '课后练习',
    status: 'analyzing',
    accessLevel: 'preview',
    createdAt: '2026-05-23T08:00:00Z',
    source: 'T12-my-reports-fixture'
  });
  client.store.upsert('ai_analysis_tasks', {
    id: 'task-t12-analyzing',
    orderId: 'order-t12-analyzing',
    ownerId: 'local-user-scoremap-t06',
    type: 'preview',
    status: 'analyzing',
    progress: 45,
    currentStep: 'locate-loss-points'
  });
}

module.exports = {
  FEEDBACK_ROUTE,
  INDEX_ROUTE,
  MY_ROUTE,
  ORDERS_ROUTE,
  REPORTS_ROUTE,
  createMyPageState,
  seedMyFixtureIfMissing
};

}
