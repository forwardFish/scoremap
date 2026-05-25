const { SCAFFOLD_ROUTES } = require('../shared/scaffold-contract');

const MINIAPP_ROUTES = [
  {
    id: 'C01',
    path: '/pages/index/index',
    title: 'Home upload shell',
    tab: 'home',
    controls: [
      { id: 'upload-material', action: 'create-order-and-upload', targetRoute: '/pages/analysis/index' },
      { id: 'view-sample-report', action: 'navigateTo', targetRoute: '/pages/preview/index' },
      { id: 'view-recent-reports', action: 'api', api: 'GET /api/my/reports', targetRoute: '/pages/reports/index' },
      { id: 'open-my-reports', action: 'api', api: 'GET /api/my/reports', targetRoute: '/pages/reports/index' },
      { id: 'open-my-tab', action: 'switchTab', targetRoute: '/pages/my/index' }
    ]
  },
  {
    id: 'C03',
    path: '/pages/analysis/index',
    title: 'Analysis progress shell',
    controls: [
      { id: 'refresh-progress', action: 'api', api: 'GET /api/diagnosis-orders/{orderId}/analysis-progress' },
      { id: 'later-view', action: 'navigateTo', targetRoute: '/pages/reports/index' }
    ]
  },
  {
    id: 'C04',
    path: '/pages/failure/index',
    title: 'Failure recovery shell',
    controls: [
      { id: 'retry-analysis', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/start-preview-analysis', targetRoute: '/pages/analysis/index' },
      { id: 'reupload', action: 'navigateTo', targetRoute: '/pages/index/index' },
      { id: 'back-home', action: 'switchTab', targetRoute: '/pages/index/index' }
    ]
  },
  {
    id: 'C05',
    path: '/pages/preview/index',
    title: 'Preview decision shell',
    controls: [
      { id: 'unlock-basic', action: 'navigateTo', targetRoute: '/pages/basic-pay/index' }
    ]
  },
  {
    id: 'C06',
    path: '/pages/basic-pay/index',
    title: 'Basic payment shell',
    controls: [
      { id: 'confirm-basic-pay', action: 'api', api: 'POST /api/payments/create', targetRoute: '/pages/basic-result/index' }
    ]
  },
  {
    id: 'C07',
    path: '/pages/basic-result/index',
    title: 'Basic result shell',
    controls: [
      { id: 'load-basic-decision', action: 'api', api: 'GET /api/diagnosis-orders/{orderId}/basic-decision' },
      { id: 'unlock-full', action: 'navigateTo', targetRoute: '/pages/full-unlock/index' }
    ]
  },
  {
    id: 'C08',
    path: '/pages/full-unlock/index',
    title: 'Full unlock shell',
    controls: [
      { id: 'confirm-full-pay', action: 'api', api: 'POST /api/payments/create', targetRoute: '/pages/full-report-entry/index' }
    ]
  },
  {
    id: 'C09',
    path: '/pages/full-report-entry/index',
    title: 'Full report entry shell',
    controls: [
      { id: 'generate-full', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/generate-full' },
      { id: 'view-full-report', action: 'navigateTo', targetRoute: '/pages/full-report/index' }
    ]
  },
  {
    id: 'C10',
    path: '/pages/full-report/index',
    title: 'Full report shell',
    controls: [
      { id: 'load-full-report', action: 'api', api: 'GET /api/diagnosis-orders/{orderId}/full-report' },
      { id: 'save-report', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/save-report', targetRoute: '/pages/my/index' },
      { id: 'export-pdf', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/export-pdf' }
    ]
  },
  {
    id: 'C11',
    path: '/pages/my/index',
    title: 'My shell',
    tab: 'my',
    controls: [
      { id: 'open-reports', action: 'navigateTo', targetRoute: '/pages/reports/index' },
      { id: 'open-orders', action: 'navigateTo', targetRoute: '/pages/orders/index' },
      { id: 'open-purchases', action: 'navigateTo', targetRoute: '/pages/orders/index' },
      { id: 'open-feedback', action: 'navigateTo', targetRoute: '/pages/feedback/index' },
      { id: 'new-analysis', action: 'switchTab', targetRoute: '/pages/index/index' },
      { id: 'submit-feedback', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/feedback' }
    ]
  },
  {
    id: 'C12',
    path: '/pages/reports/index',
    title: 'Reports shell',
    controls: [
      { id: 'load-my-reports', action: 'api', api: 'GET /api/my/reports' },
      { id: 'open-report-card', action: 'guardedRoute' }
    ]
  },
  {
    id: 'C11A',
    path: '/pages/orders/index',
    title: 'Orders and purchases shell',
    controls: [
      { id: 'load-order-records', action: 'api', api: 'GET /api/my/reports' }
    ]
  },
  {
    id: 'C11B',
    path: '/pages/feedback/index',
    title: 'Feedback shell',
    controls: [
      { id: 'submit-feedback', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/feedback', targetRoute: '/pages/my/index' }
    ]
  }
];

const TAB_BAR = [
  { id: 'home', text: '首页', pagePath: '/pages/index/index' },
  { id: 'my', text: '我的', pagePath: '/pages/my/index' }
];

module.exports = {
  MINIAPP_ROUTES,
  TAB_BAR,
  routes: SCAFFOLD_ROUTES,
  tabBar: TAB_BAR
};
