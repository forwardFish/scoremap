const { SCAFFOLD_ROUTES } = require('../shared/scaffold-contract');
const { AI_TUTOR_V13_DESIGN_TOKENS, AI_TUTOR_V13_REFERENCES } = require('./utils/ai-tutor-v13-design');

const V143_DESIGN_TOKENS = {
  version: 'v1.4.3',
  source: 'docs/auto-execute/scoremap-v143-mvp-ui-reference-map.md',
  colors: {
    page: '#f7f4ef',
    surface: '#ffffff',
    surfaceMuted: '#fff8ec',
    primary: '#2f6bff',
    primaryText: '#ffffff',
    accent: '#ff8a34',
    success: '#13a66b',
    warning: '#f4a100',
    danger: '#d93025',
    text: '#1f2937',
    textMuted: '#667085',
    border: '#e7dfd3'
  },
  typography: {
    pageTitle: { sizeRpx: 40, lineHeightRpx: 52, weight: 700 },
    sectionTitle: { sizeRpx: 32, lineHeightRpx: 44, weight: 700 },
    body: { sizeRpx: 28, lineHeightRpx: 40, weight: 400 },
    caption: { sizeRpx: 24, lineHeightRpx: 34, weight: 400 },
    action: { sizeRpx: 30, lineHeightRpx: 42, weight: 700 }
  },
  spacingRpx: {
    pageX: 32,
    pageY: 24,
    cardPadding: 28,
    stackSm: 12,
    stackMd: 20,
    stackLg: 32,
    minTouchTarget: 88,
    tabBarHeight: 108
  },
  radiusRpx: {
    card: 24,
    control: 18,
    pill: 999
  },
  shadow: {
    card: '0 8rpx 28rpx rgba(31, 41, 55, 0.08)'
  },
  copyPolicy: {
    mojibakeForbidden: true,
    guaranteedScoreClaimForbidden: true,
    localOnlyAssets: true
  }
};

const V143_NAVIGATION_MAP = [
  {
    uiId: 'UI143-C01',
    routeId: 'C01',
    route: '/pages/index/index',
    title: '首页上传',
    ownerScenarios: ['O143-01'],
    clickNames: ['C01.upload-material', 'C01.select-upload-file', 'C01.view-sample-report', 'C01.open-my-tab'],
    apiIds: ['API143-001', 'API143-002', 'API143-003']
  },
  {
    uiId: 'UI143-C02',
    routeId: 'C02',
    route: '/pages/student-info/index',
    title: '填写孩子信息',
    ownerScenarios: ['O143-01'],
    clickNames: ['C02.submit-student-info', 'C02.back-upload', 'C02.select-grade', 'C02.select-subject'],
    apiIds: ['API143-001']
  },
  {
    uiId: 'UI143-C03',
    routeId: 'C03',
    route: '/pages/analysis/index',
    title: 'AI分析中',
    ownerScenarios: ['O143-01'],
    clickNames: ['C03.refresh-progress', 'C03.later-view'],
    apiIds: ['API143-004']
  },
  {
    uiId: 'UI143-C04',
    routeId: 'C04',
    route: '/pages/failure/index',
    title: '处理失败',
    ownerScenarios: ['O143-12'],
    clickNames: ['C04.retry-analysis', 'C04.reupload', 'C04.back-home'],
    apiIds: ['API143-003']
  },
  {
    uiId: 'UI143-C05',
    routeId: 'C05',
    route: '/pages/preview/index',
    title: '初判预览',
    ownerScenarios: ['O143-02'],
    clickNames: ['C05.unlock-basic'],
    apiIds: ['API143-005', 'API143-006', 'API143-007']
  },
  {
    uiId: 'UI143-C07',
    routeId: 'C07',
    route: '/pages/basic-result/index',
    title: '完整初判',
    ownerScenarios: ['O143-03'],
    clickNames: ['C07.load-basic-decision', 'C07.unlock-full'],
    apiIds: ['API143-008', 'API143-009']
  },
  {
    uiId: 'UI143-C10A',
    routeId: 'C10',
    route: '/pages/full-report/index',
    title: '完整报告核心五卡',
    ownerScenarios: ['O143-04'],
    clickNames: ['C10.load-full-report', 'C10.open-wrong-question-card', 'C10.save-report', 'C10.export-pdf'],
    apiIds: ['API143-010', 'API143-016']
  },
  {
    uiId: 'UI143-C10B',
    routeId: 'C10',
    route: '/pages/full-report/index',
    title: '完整报告修复后回写',
    ownerScenarios: ['O143-08'],
    clickNames: ['C10.load-full-report', 'C10.open-wrong-question-card'],
    apiIds: ['API143-010', 'API143-014']
  },
  {
    uiId: 'UI143-C11C12',
    routeId: 'C11/C12',
    route: '/pages/my/index',
    compatibleRoutes: ['/pages/reports/index'],
    title: '我的报告',
    ownerScenarios: ['O143-09', 'O143-10'],
    clickNames: ['C11.open-reports', 'C11.open-feedback', 'C12.load-my-reports', 'C12.open-report-card'],
    apiIds: ['API143-017', 'API143-018']
  },
  {
    uiId: 'UI143-C13-1',
    routeId: 'C13',
    route: '/pages/full-report/index',
    drawer: 'repair-diagnosis',
    title: '错因诊断',
    ownerScenarios: ['O143-04'],
    clickNames: ['C13.open-repair-diagnosis'],
    apiIds: ['API143-015']
  },
  {
    uiId: 'UI143-C13-2',
    routeId: 'C13',
    route: '/pages/full-report/index',
    drawer: 'repair-explanation',
    title: '换法讲解',
    ownerScenarios: ['O143-05'],
    clickNames: ['C13.teach-child'],
    apiIds: ['API143-011']
  },
  {
    uiId: 'UI143-C13-3',
    routeId: 'C13',
    route: '/pages/full-report/index',
    drawer: 'repair-exercise',
    title: '验证练习',
    ownerScenarios: ['O143-06', 'O143-07'],
    clickNames: ['C13.generate-similar-exercise', 'C13.submit-exercise-answer'],
    apiIds: ['API143-012', 'API143-013']
  },
  {
    uiId: 'UI143-C13-4',
    routeId: 'C13',
    route: '/pages/full-report/index',
    drawer: 'repair-mastery',
    title: '掌握判断',
    ownerScenarios: ['O143-08'],
    clickNames: ['C13.check-mastery'],
    apiIds: ['API143-014']
  }
];

const MINIAPP_ROUTES = [
  {
    id: 'C01',
    path: '/pages/index/index',
    title: 'Home upload shell',
    tab: 'home',
    controls: [
      { id: 'upload-material', action: 'chooseLocalFile', targetRoute: '/pages/student-info/index' },
      { id: 'select-upload-file', action: 'chooseLocalFile', targetRoute: '/pages/student-info/index', fileTypes: ['image/png', 'image/jpeg', 'application/pdf'] },
      { id: 'view-sample-report', action: 'navigateTo', targetRoute: '/pages/preview/index' },
      { id: 'view-recent-reports', action: 'api', api: 'GET /api/my/reports', targetRoute: '/pages/reports/index' },
      { id: 'open-my-reports', action: 'api', api: 'GET /api/my/reports', targetRoute: '/pages/reports/index' },
      { id: 'open-my-tab', action: 'switchTab', targetRoute: '/pages/my/index' }
    ]
  },
  {
    id: 'C02',
    path: '/pages/student-info/index',
    title: 'Student info form',
    controls: [
      { id: 'submit-student-info', action: 'apiNavigate', api: 'POST /api/diagnosis-orders', targetRoute: '/pages/analysis/index' },
      { id: 'back-upload', action: 'navigateTo', targetRoute: '/pages/index/index' },
      { id: 'select-grade', action: 'noNavigation', behavior: 'picker-grade' },
      { id: 'select-subject', action: 'noNavigation', behavior: 'picker-subject' },
      { id: 'toggle-material-paper', action: 'noNavigation', behavior: 'toggle-material-type' },
      { id: 'toggle-material-wrong', action: 'noNavigation', behavior: 'toggle-material-type' },
      { id: 'toggle-material-score', action: 'noNavigation', behavior: 'toggle-material-type' }
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
    title: 'Full report shell with AI tutor entry',
    states: ['default', 'aiTutorReady', 'quotaExhausted'],
    referenceId: 'V13-UI-FULL-REPORT',
    controls: [
      { id: 'load-full-report', action: 'api', api: 'GET /api/diagnosis-orders/{orderId}/full-report' },
      { id: 'load-wrong-questions', action: 'api', api: 'GET /api/diagnosis-orders/{orderId}/questions' },
      { id: 'open-wrong-question-card', action: 'navigateTo', targetRoute: '/pages/wrong-question/index', api: 'GET /api/diagnosis-orders/{orderId}/questions' },
      { id: 'share-report', action: 'noNavigation', behavior: 'local-share-placeholder' },
      { id: 'save-report', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/save-report', targetRoute: '/pages/my/index' },
      { id: 'export-pdf', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/export-pdf' }
    ]
  },
  {
    id: 'V13-C01',
    path: '/pages/wrong-question/index',
    title: 'Wrong-question detail',
    states: ['detail', 'lockedBasic', 'historyReady'],
    referenceId: 'V13-UI-QUESTION-DETAIL',
    controls: [
      { id: 'back-to-full-report', action: 'navigateTo', targetRoute: '/pages/full-report/index' },
      { id: 'more-menu', action: 'noNavigation', behavior: 'local-more-menu-placeholder' },
      { id: 'load-question-detail', action: 'api', api: 'GET /api/diagnosis-orders/{orderId}/questions' },
      { id: 'open-ai-tutor', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index', api: 'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions' },
      { id: 'open-history-row', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index', api: 'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions' },
      { id: 'bottom-share-report', action: 'noNavigation', behavior: 'local-share-placeholder' },
      { id: 'bottom-ai-tutor', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index' },
      { id: 'bottom-export-pdf', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/export-pdf' }
    ]
  },
  {
    id: 'V13-C02',
    path: '/pages/ai-tutor/index',
    title: 'AI tutor fixed follow-up',
    states: ['interaction', 'quotaAvailable', 'quotaExhausted', 'providerFailure'],
    referenceId: 'V13-UI-AI-TUTOR',
    controls: [
      { id: 'back-to-question-detail', action: 'navigateTo', targetRoute: '/pages/wrong-question/index' },
      { id: 'open-history', action: 'api', api: 'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions' },
      { id: 'ask-step-explanation', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/teach-child', fixedAction: 'teach_child' },
      { id: 'ask-why-method', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/teach-child', fixedAction: 'explain_differently' },
      { id: 'ask-another-explanation', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/teach-child', fixedAction: 'simpler_example' },
      { id: 'generate-similar-exercise', action: 'apiNavigate', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/similar-exercise', fixedAction: 'similar_exercise', targetRoute: '/pages/ai-exercise/index' },
      { id: 'mark-understood', action: 'apiNavigate', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/check-mastery', fixedAction: 'check_mastery', targetRoute: '/pages/full-report/index' },
      { id: 'toggle-question-context', action: 'noNavigation', behavior: 'accordion-toggle' },
      { id: 'bottom-share-report', action: 'noNavigation', behavior: 'local-share-placeholder' },
      { id: 'bottom-ai-tutor', action: 'noNavigation', behavior: 'active-tab' },
      { id: 'bottom-export-pdf', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/export-pdf' }
    ]
  },
  {
    id: 'V13-C03',
    path: '/pages/ai-exercise/index',
    title: 'Similar exercise',
    states: ['pendingAnswer', 'optionSelected', 'missingOption'],
    referenceId: 'V13-UI-EXERCISE',
    controls: [
      { id: 'back-to-ai-tutor', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index' },
      { id: 'refresh-exercise', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/similar-exercise', fixedAction: 'similar_exercise' },
      { id: 'select-option-a', action: 'noNavigation', behavior: 'select-answer-option' },
      { id: 'select-option-b', action: 'noNavigation', behavior: 'select-answer-option' },
      { id: 'select-option-c', action: 'noNavigation', behavior: 'select-answer-option' },
      { id: 'select-option-d', action: 'noNavigation', behavior: 'select-answer-option' },
      { id: 'submit-answer', action: 'apiNavigate', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer', targetRoute: '/pages/ai-exercise-feedback/index' },
      { id: 'open-question-context', action: 'navigateTo', targetRoute: '/pages/wrong-question/index' },
      { id: 'open-history-row', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index' },
      { id: 'bottom-share-report', action: 'noNavigation', behavior: 'local-share-placeholder' },
      { id: 'bottom-ai-tutor', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index' },
      { id: 'bottom-export-pdf', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/export-pdf' }
    ]
  },
  {
    id: 'V13-C04',
    path: '/pages/ai-exercise-feedback/index',
    title: 'Similar exercise answer feedback',
    states: ['answered', 'correct', 'incorrect'],
    referenceId: 'V13-UI-FEEDBACK',
    controls: [
      { id: 'back-to-exercise', action: 'navigateTo', targetRoute: '/pages/ai-exercise/index' },
      { id: 'more-menu', action: 'noNavigation', behavior: 'local-more-menu-placeholder' },
      { id: 'retry-similar-exercise', action: 'apiNavigate', api: 'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/similar-exercise', fixedAction: 'similar_exercise', targetRoute: '/pages/ai-exercise/index' },
      { id: 'return-full-report', action: 'navigateTo', targetRoute: '/pages/full-report/index' },
      { id: 'open-interaction-record', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index', api: 'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions' },
      { id: 'bottom-share-report', action: 'noNavigation', behavior: 'local-share-placeholder' },
      { id: 'bottom-ai-tutor', action: 'navigateTo', targetRoute: '/pages/ai-tutor/index' },
      { id: 'bottom-export-pdf', action: 'api', api: 'POST /api/diagnosis-orders/{orderId}/export-pdf' }
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

const V143_TAB_BAR = [
  { id: 'home', text: '首页', pagePath: '/pages/index/index' },
  { id: 'my', text: '我的', pagePath: '/pages/my/index' }
];

module.exports = {
  MINIAPP_ROUTES,
  TAB_BAR: V143_TAB_BAR,
  V143_DESIGN_TOKENS,
  V143_NAVIGATION_MAP,
  AI_TUTOR_V13_DESIGN_TOKENS,
  AI_TUTOR_V13_REFERENCES,
  routes: SCAFFOLD_ROUTES,
  tabBar: V143_TAB_BAR
};
