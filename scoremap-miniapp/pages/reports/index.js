if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "我的报告",
  "reference": "",
  "derived": true,
  "hotspots": [
    {
      "action": "open",
      "label": "查看完整报告",
      "className": "reports-card"
    },
    {
      "action": "home",
      "label": "首页",
      "className": "tab-home"
    },
    {
      "action": "my",
      "label": "我的",
      "className": "tab-my"
    }
  ],
  "actions": {
    "open": {
      "url": "/pages/full-report/index"
    },
    "home": {
      "url": "/pages/index/index"
    },
    "my": {
      "url": "/pages/my/index"
    }
  },
  "cards": [
    "五年级数学单元测验完整报告",
    "完整报告已解锁 / paid",
    "分析中的数学资料"
  ]
});
} else {
const { resolveOrderRoute } = require('../../utils/navigation');
const { createMiniappApiClient } = require('../../services/api-client');
const { seedMyFixtureIfMissing } = require('../my');

const REPORTS_ROUTE = '/pages/reports/index';

function createReportsPageState(clientOrItems = createMiniappApiClient(), options = {}) {
  if (Array.isArray(clientOrItems)) {
    return createStateFromItems(clientOrItems, options);
  }

  const client = clientOrItems;
  seedMyFixtureIfMissing(client);
  let response = null;

  const page = {
    route: REPORTS_ROUTE,
    uiReference: {
      prd: 'PRD C12 我的报告列表页'
    },
    title: '我的报告',
    loadReports(filter = options.filter || 'all') {
      response = client.request('GET', '/api/my/reports', { source: 'reports-page-list', filter });
      return {
        status: response.status === 200 ? 'REPORTS_READY' : 'REPORTS_FAILED',
        apiStatus: response.status,
        filter,
        count: getFilteredItems(response.body.items, filter).length
      };
    },
    openReportCard(orderId) {
      if (!response) page.loadReports();
      const item = response.body.items.find((entry) => entry.orderId === orderId);
      return {
        status: item ? 'NAVIGATE' : 'NOT_FOUND',
        orderId,
        targetRoute: item ? resolveOrderRoute(item) : null,
        disabledReason: item ? null : '报告不存在'
      };
    },
    getState(filter = options.filter || 'all') {
      if (!response) page.loadReports(filter);
      return createStateFromItems(response.body.items, { filter, apiStatus: response.status });
    }
  };

  return page;
}

function createStateFromItems(items = [], options = {}) {
  const filter = options.filter || 'all';
  const filteredItems = getFilteredItems(items, filter);
  return {
    route: REPORTS_ROUTE,
    title: '我的报告',
    uiReference: { prd: 'PRD C12 我的报告列表页' },
    filterTabs: [
      { id: 'all', text: '全部', active: filter === 'all' },
      { id: 'analyzing', text: '分析中', active: filter === 'analyzing' },
      { id: 'generated', text: '已生成', active: filter === 'generated' },
      { id: 'failed', text: '失败/待补', active: filter === 'failed' }
    ],
    controls: [
      { id: 'load-my-reports', text: '刷新报告', api: 'GET /api/my/reports' }
    ],
    emptyState: filteredItems.length === 0
      ? { visible: true, text: '暂无报告，继续新建分析' }
      : { visible: false },
    cards: filteredItems.map((item) => ({
      orderId: item.orderId,
      title: item.title || 'Score analysis report',
      grade: item.grade || 'Grade 5',
      subject: item.subject || 'Math',
      examType: item.examType || 'Unit test',
      createdAt: item.createdAt || null,
      status: item.status,
      statusText: toStatusText(item),
      paymentStatus: item.paymentStatus || 'unpaid',
      accessLevel: item.accessLevel,
      targetRoute: resolveOrderRoute(item),
      actionText: toActionText(item),
      savedReport: Boolean(item.savedReport)
    }))
  };
}

function getFilteredItems(items, filter) {
  if (filter === 'analyzing') return items.filter((item) => ['uploaded', 'analyzing'].includes(item.status));
  if (filter === 'generated') return items.filter((item) => ['basic', 'full'].includes(item.accessLevel));
  if (filter === 'failed') return items.filter((item) => ['failed', 'timeout', 'need_more_material'].includes(item.status));
  return items;
}

function toStatusText(item) {
  if (item.status === 'analyzing' || item.status === 'uploaded') return '分析中';
  if (item.status === 'preview_done' && item.accessLevel === 'preview') return '初判预览已生成';
  if (item.accessLevel === 'basic') return '1 元初判已解锁';
  if (item.accessLevel === 'full') return '完整报告已解锁';
  if (item.status === 'need_more_material') return '待补资料';
  if (item.status === 'failed' || item.status === 'timeout') return '处理失败';
  return '待上传资料';
}

function toActionText(item) {
  if (item.status === 'analyzing' || item.status === 'uploaded') return '查看进度';
  if (item.status === 'failed' || item.status === 'timeout') return '重新处理';
  if (item.status === 'need_more_material') return '补充资料';
  if (item.accessLevel === 'full') return '查看完整报告';
  if (item.accessLevel === 'basic') return '查看初判结果';
  if (item.status === 'preview_done') return '查看初判预览';
  return '继续上传';
}

module.exports = { REPORTS_ROUTE, createReportsPageState, createStateFromItems };

}
