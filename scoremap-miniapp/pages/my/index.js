const { createMiniappApiClient } = require('../../services/api-client');

const MY_ROUTE = '/pages/my/index';
const REPORTS_ROUTE = '/pages/reports/index';
const ORDERS_ROUTE = '/pages/orders/index';
const FEEDBACK_ROUTE = '/pages/feedback/index';
const INDEX_ROUTE = '/pages/index/index';
const LOGIN_ROUTE = '/pages/login/login';
const LOCAL_USER_ID = 'local-user-scoremap-t06';
const GUEST_AVATAR = '/assets/icons/user-avatar-gray.png';

function createRuntimeData() {
  return {
    reference: '',
    derived: true,
    title: '我的',
    hotspots: [
      { action: 'profile', label: '登录/个人资料', className: 'my-profile' },
      { action: 'reports', label: '我的报告', className: 'my-reports' },
      { action: 'orders', label: '订单记录', className: 'my-orders' },
      { action: 'purchases', label: '购买记录', className: 'my-purchases' },
      { action: 'feedback', label: '帮助与反馈', className: 'my-feedback' },
      { action: 'new', label: '继续新建分析', className: 'my-new' },
      { action: 'home', label: '首页', className: 'tab-home' }
    ],
    ...guestRuntimePatch()
  };
}

function guestRuntimePatch() {
  return {
    isLoggedIn: false,
    avatarUrl: GUEST_AVATAR,
    displayName: '未登录',
    loginStateText: '免费体验',
    profileHint: '点击头像区域完成微信登录',
    rightsCard: {
      title: '我的权益',
      subtitle: '登录后同步报告、订单和购买记录',
      statusText: '未登录'
    },
    stats: [
      { id: 'reports', label: '报告', value: 0 },
      { id: 'orders', label: '订单', value: 0 },
      { id: 'purchases', label: '购买', value: 0 }
    ],
    quickEntries: [
      { id: 'login', text: '微信登录', action: 'login' },
      { id: 'new-analysis', text: '免费体验', action: 'new' }
    ],
    recentReports: [],
    loading: false,
    toastText: ''
  };
}

function loggedInRuntimePatch(user = {}, summary = {}) {
  const displayName = displayNickname(user.nickname || user.nickName || user.name);
  return {
    isLoggedIn: true,
    avatarUrl: displayAvatar(user),
    displayName,
    loginStateText: '微信已登录',
    profileHint: '头像昵称已同步',
    rightsCard: {
      title: '我的权益',
      subtitle: '报告、订单、购买记录以后端身份资源为准',
      statusText: '可查看'
    },
    stats: [
      { id: 'reports', label: '报告', value: summary.reportCount || 0 },
      { id: 'orders', label: '订单', value: summary.orderCount || 0 },
      { id: 'purchases', label: '购买', value: summary.purchaseCount || 0 }
    ],
    quickEntries: [
      { id: 'open-reports', text: '我的报告', action: 'reports' },
      { id: 'open-orders', text: '订单记录', action: 'orders' },
      { id: 'open-purchases', text: '购买记录', action: 'purchases' },
      { id: 'open-feedback', text: '帮助与反馈', action: 'feedback' }
    ],
    recentReports: summary.recentReports || [],
    loading: false,
    toastText: ''
  };
}

function displayAvatar(user = {}) {
  return user.avatarUrl || user.avatar || GUEST_AVATAR;
}

function displayNickname(name = '') {
  const text = String(name || '').trim();
  if (!text || text === '微信用户' || text === 'Wechat User' || text === 'WeChat User') return '未设置昵称';
  return text;
}

function summarizeRuntimeReports(items = []) {
  const paidItems = items.filter((item) => item.paymentStatus === 'paid' || Number(item.paidAmountYuan || 0) > 0);
  return {
    reportCount: items.length,
    orderCount: items.length,
    purchaseCount: paidItems.length,
    recentReports: items.slice(0, 3).map((item) => ({
      orderId: item.orderId || item.id,
      title: item.title || 'AI 提分报告',
      statusText: toStatusText(item),
      accessLevel: item.accessLevel || 'preview'
    }))
  };
}

function toStatusText(item = {}) {
  if (item.status === 'analyzing' || item.status === 'uploaded') return '分析中';
  if (item.accessLevel === 'full') return '完整报告已解锁';
  if (item.accessLevel === 'basic') return '1 元初判已解锁';
  if (item.status === 'preview_done') return '初判预览已生成';
  if (item.status === 'failed' || item.status === 'timeout') return '处理失败';
  return '待处理';
}

function isAuthError(error) {
  const message = String((error && (error.message || error.errMsg || error.code)) || error || '');
  return /unauthorized|401|403|token|auth|鉴权|授权|登录/i.test(message);
}

function navigate(url, mode = 'navigateTo') {
  if (typeof wx === 'undefined') return;
  if (url === INDEX_ROUTE || url === MY_ROUTE || mode === 'switchTab') {
    wx.switchTab({ url, fail: () => wx.reLaunch({ url }) });
    return;
  }
  wx.navigateTo({ url, fail: () => wx.redirectTo({ url }) });
}

if (typeof Page === 'function') {
  const api = require('../../services/api');
  const storage = require('../../utils/storage');
  const { requireLogin } = require('../../utils/auth');

  Page({
    data: createRuntimeData(),

    onLoad(query = {}) {
      this.query = query;
      if (typeof wx !== 'undefined' && wx.hideTabBar) {
        wx.hideTabBar({ animation: false, fail() {} });
      }
    },

    onShow() {
      if (typeof wx !== 'undefined' && wx.hideTabBar) {
        wx.hideTabBar({ animation: false, fail() {} });
      }
      this.refreshProfile();
    },

    async refreshProfile() {
      const token = storage.getToken();
      if (!token) {
        this.setData(guestRuntimePatch());
        return;
      }

      const cachedUser = storage.getUser() || {};
      this.setData({ ...loggedInRuntimePatch(cachedUser), loading: true });

      try {
        const me = await api.getMe();
        const user = { ...cachedUser, ...(me.user || {}) };
        storage.setUser(user);
        let summary = {};
        try {
          const reports = await api.getMyReports();
          summary = summarizeRuntimeReports(reports.items || []);
        } catch (error) {
          if (isAuthError(error)) throw error;
        }
        this.setData(loggedInRuntimePatch(user, summary));
      } catch (error) {
        if (isAuthError(error)) {
          storage.clearLogin();
          this.setData(guestRuntimePatch());
          return;
        }
        this.setData({ loading: false, toastText: error.message || '同步失败，请稍后重试' });
      }
    },

    onTap(event) {
      const action = event.currentTarget.dataset.action;
      if (action === 'home' || action === 'new') {
        navigate(INDEX_ROUTE, 'switchTab');
        return null;
      }
      if (action === 'login' || action === 'profile') {
        if (!requireLogin({ redirectUrl: MY_ROUTE })) return null;
        this.refreshProfile();
        return null;
      }
      if (!requireLogin({ redirectUrl: MY_ROUTE })) return null;
      if (action === 'reports') navigate(REPORTS_ROUTE);
      if (action === 'orders') navigate(ORDERS_ROUTE);
      if (action === 'purchases') navigate(`${ORDERS_ROUTE}?mode=purchases`);
      if (action === 'feedback') navigate(FEEDBACK_ROUTE);
      return null;
    }
  });
}

function createMyPageState(client = createMiniappApiClient(), options = {}) {
  const loggedIn = options.loggedIn !== false;
  const userId = options.userId || LOCAL_USER_ID;
  let reportsResponse = null;
  if (loggedIn) seedMyFixtureIfMissing(client);

  const page = {
    route: MY_ROUTE,
    tab: 'my',
    uiReference: {
      png: 'ui-reference-catalog/小程序/我的.png',
      stitch: 'ui-reference-catalog/小程序/stitch_codex_development_blueprints/_1/screen-reference'
    },
    title: '我的',
    loadSummary() {
      if (!loggedIn) {
        reportsResponse = { status: 401, body: { items: [] } };
        return {
          status: 'LOGIN_REQUIRED',
          apiStatus: 401,
          reportCount: 0,
          generatedCount: 0,
          analyzingCount: 0,
          needMaterialCount: 0
        };
      }
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
    login() {
      return loginRequiredResult();
    },
    openReports() {
      if (!loggedIn) return loginRequiredResult();
      return { status: 'NAVIGATE', targetRoute: REPORTS_ROUTE };
    },
    openOrders() {
      if (!loggedIn) return loginRequiredResult();
      return { status: 'NAVIGATE', targetRoute: ORDERS_ROUTE, filter: 'orders' };
    },
    openPurchases() {
      if (!loggedIn) return loginRequiredResult();
      return { status: 'NAVIGATE', targetRoute: ORDERS_ROUTE, filter: 'purchases' };
    },
    openFeedback() {
      if (!loggedIn) return loginRequiredResult();
      return { status: 'NAVIGATE', targetRoute: FEEDBACK_ROUTE, query: { orderId: options.feedbackOrderId || 'order-t12-full' } };
    },
    newAnalysis() {
      return { status: 'SWITCH_TAB', targetRoute: INDEX_ROUTE };
    },
    copyUserId() {
      if (!loggedIn) return loginRequiredResult();
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
        isLoggedIn: loggedIn,
        profile: loggedIn
          ? {
            avatarText: '家长',
            nickname: options.nickname || '匿名家长',
            avatarUrl: options.avatarUrl || GUEST_AVATAR,
            userId,
            loginStateText: '微信已登录',
            copyControl: { id: 'copy-user-id', text: '复制 ID' }
          }
          : {
            avatarText: '访客',
            nickname: '未登录',
            avatarUrl: GUEST_AVATAR,
            userId: '',
            loginStateText: '未登录',
            copyControl: null
          },
        rightsCard: loggedIn
          ? {
            title: '我的权益',
            subtitle: '已购报告权益 / 内测体验权益',
            proTreatment: 'MVP placeholder only; no subscription, renewal, or real membership purchase is exposed.'
          }
          : {
            title: '免费体验',
            subtitle: '登录后查看报告、订单、购买记录和权益',
            proTreatment: 'Guest state only; protected identity resources require WeChat login.'
          },
        stats: [
          { id: 'generated-reports', label: '已生成报告', value: summary.generatedCount },
          { id: 'analyzing', label: '分析中', value: summary.analyzingCount },
          { id: 'need-material', label: '待补资料', value: summary.needMaterialCount }
        ],
        recentReports: loggedIn ? items.slice(0, 3).map((item) => enrichMyReportItem(client, item)) : [],
        quickEntries: loggedIn
          ? [
            { id: 'open-reports', text: '我的报告', targetRoute: REPORTS_ROUTE },
            { id: 'open-orders', text: '订单记录', targetRoute: ORDERS_ROUTE },
            { id: 'open-purchases', text: '购买记录', targetRoute: ORDERS_ROUTE },
            { id: 'open-feedback', text: '帮助与反馈', targetRoute: FEEDBACK_ROUTE }
          ]
          : [
            { id: 'login', text: '微信登录', targetRoute: LOGIN_ROUTE },
            { id: 'new-analysis', text: '免费体验', targetRoute: INDEX_ROUTE }
          ],
        controls: loggedIn
          ? [
            { id: 'load-my-reports', text: '刷新我的报告', api: 'GET /api/my/reports' },
            { id: 'copy-user-id', text: '复制 ID', toast: '本地用户 ID 已复制' },
            { id: 'open-reports', text: '我的报告', targetRoute: REPORTS_ROUTE },
            { id: 'open-orders', text: '订单记录', targetRoute: ORDERS_ROUTE },
            { id: 'open-purchases', text: '购买记录', targetRoute: ORDERS_ROUTE },
            { id: 'open-feedback', text: '帮助与反馈', targetRoute: FEEDBACK_ROUTE },
            { id: 'new-analysis', text: '继续新建分析', targetRoute: INDEX_ROUTE }
          ]
          : [
            { id: 'login', text: '微信登录', targetRoute: LOGIN_ROUTE },
            { id: 'new-analysis', text: '免费体验', targetRoute: INDEX_ROUTE }
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

function loginRequiredResult() {
  return {
    status: 'LOGIN_REQUIRED',
    loginRequired: true,
    targetRoute: LOGIN_ROUTE,
    redirectUrl: MY_ROUTE,
    toast: '请先完成微信登录后再继续'
  };
}

function seedMyFixtureIfMissing(client) {
  if (client.store.list('diagnosis_orders').length > 0) return;
  client.store.upsert('diagnosis_orders', {
    id: 'order-t12-full',
    ownerId: LOCAL_USER_ID,
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
    ownerId: LOCAL_USER_ID,
    paymentType: 'basic',
    amountYuan: 1,
    status: 'paid',
    adapter: 'local-wechat-pay-mock'
  });
  client.store.upsert('payments', {
    id: 'payment-t12-full',
    orderId: 'order-t12-full',
    ownerId: LOCAL_USER_ID,
    paymentType: 'full',
    amountYuan: 9.9,
    status: 'paid',
    adapter: 'local-wechat-pay-mock'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-t12-analyzing',
    ownerId: LOCAL_USER_ID,
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
    ownerId: LOCAL_USER_ID,
    type: 'preview',
    status: 'analyzing',
    progress: 45,
    currentStep: 'locate-loss-points'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-t29-basic-only',
    ownerId: LOCAL_USER_ID,
    title: '五年级数学基础初判报告',
    grade: '五年级',
    subject: '数学',
    examType: '单元测验',
    status: 'basic_done',
    accessLevel: 'basic',
    savedReport: true,
    createdAt: '2026-05-24T08:00:00Z',
    source: 'T29-basic-entitlement-fixture'
  });
  client.store.upsert('payments', {
    id: 'payment-t29-basic-only',
    orderId: 'order-t29-basic-only',
    ownerId: LOCAL_USER_ID,
    paymentType: 'basic',
    amountYuan: 1,
    status: 'paid',
    adapter: 'local-wechat-pay-mock'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-v143-preview',
    ownerId: LOCAL_USER_ID,
    title: 'Preview decision recovery report',
    grade: 'Grade 5',
    subject: 'Math',
    examType: 'Unit test',
    status: 'preview_done',
    accessLevel: 'preview',
    createdAt: '2026-05-24T09:00:00Z',
    source: 'V143-15-my-reports-recovery-fixture'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-v143-uploaded',
    ownerId: LOCAL_USER_ID,
    title: 'Uploaded material waiting analysis',
    grade: 'Grade 5',
    subject: 'Math',
    examType: 'Homework',
    status: 'uploaded',
    accessLevel: 'preview',
    createdAt: '2026-05-24T10:00:00Z',
    source: 'V143-15-my-reports-recovery-fixture'
  });
  client.store.upsert('ai_analysis_tasks', {
    id: 'task-v143-uploaded',
    orderId: 'order-v143-uploaded',
    ownerId: LOCAL_USER_ID,
    type: 'preview',
    status: 'uploaded',
    progress: 10,
    currentStep: 'waiting_analysis_start'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-v143-need-material',
    ownerId: LOCAL_USER_ID,
    title: 'Need more material recovery report',
    grade: 'Grade 5',
    subject: 'Math',
    examType: 'Unit test',
    status: 'need_more_material',
    accessLevel: 'preview',
    createdAt: '2026-05-24T11:00:00Z',
    source: 'V143-15-my-reports-recovery-fixture'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-v143-failed',
    ownerId: LOCAL_USER_ID,
    title: 'Failed analysis recovery report',
    grade: 'Grade 5',
    subject: 'Math',
    examType: 'Unit test',
    status: 'failed',
    accessLevel: 'preview',
    createdAt: '2026-05-24T12:00:00Z',
    source: 'V143-15-my-reports-recovery-fixture'
  });
  client.store.upsert('diagnosis_orders', {
    id: 'order-v143-timeout',
    ownerId: LOCAL_USER_ID,
    title: 'Timeout recovery report',
    grade: 'Grade 5',
    subject: 'Math',
    examType: 'Unit test',
    status: 'timeout',
    accessLevel: 'preview',
    createdAt: '2026-05-24T13:00:00Z',
    source: 'V143-15-my-reports-recovery-fixture'
  });
}

function enrichMyReportItem(client, item) {
  if (item.accessLevel !== 'full') {
    return {
      ...item,
      aiTutor: {
        formalEntitlement: false,
        statusText: item.accessLevel === 'basic' ? '基础报告未解锁正式 AI 追问' : '未解锁 AI 追问',
        remainingText: '解锁 9.9 元完整报告后可用',
        historyEntry: null
      }
    };
  }
  const questionsResponse = client.request('GET', `/api/diagnosis-orders/${item.orderId}/questions`, {
    source: 'my-page-ai-tutor-summary'
  });
  const cards = questionsResponse.body.wrongQuestionCards || [];
  const firstQuestion = cards[0] || null;
  const interactionsResponse = firstQuestion
    ? client.request('GET', `/api/diagnosis-orders/${item.orderId}/questions/${firstQuestion.questionId}/interactions`, {
      source: 'my-page-ai-tutor-history-summary'
    })
    : { body: { items: [] } };
  const reportQuota = questionsResponse.body.reportQuota || { used: 0, total: 10, remaining: 10 };
  return {
    ...item,
    aiTutor: {
      formalEntitlement: true,
      statusText: '完整报告 AI 追问可继续',
      remainingText: `本报告剩余 ${reportQuota.remaining}/${reportQuota.total} 次`,
      reportQuota,
      wrongQuestionCount: cards.length,
      firstQuestionId: firstQuestion && firstQuestion.questionId,
      historyCount: interactionsResponse.body.items.length,
      historyEntry: firstQuestion
        ? {
          id: 'resume-ai-tutor-history',
          targetRoute: '/pages/ai-tutor/index',
          query: { orderId: item.orderId, questionId: firstQuestion.questionId, tab: 'history' }
        }
        : null
    }
  };
}

module.exports = {
  FEEDBACK_ROUTE,
  INDEX_ROUTE,
  LOGIN_ROUTE,
  MY_ROUTE,
  ORDERS_ROUTE,
  REPORTS_ROUTE,
  createMyPageState,
  seedMyFixtureIfMissing,
  enrichMyReportItem
};
