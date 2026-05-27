if (typeof Page === 'function') {
  const TAB_ROUTES = { '/pages/index/index': true, '/pages/my/index': true };

  function navigate(url) {
    if (typeof wx === 'undefined') return;
    if (TAB_ROUTES[url]) {
      wx.switchTab({ url, fail: () => wx.reLaunch({ url }) });
      return;
    }
    wx.navigateTo({ url, fail: () => wx.redirectTo({ url }) });
  }

  Page({
    data: {
      reference: '',
      derived: true,
      title: '我的报告',
      hotspots: [
        { action: 'full', label: '查看完整报告', className: 'reports-card-full' },
        { action: 'analyzing', label: '查看分析进度', className: 'reports-card-analyzing' },
        { action: 'home', label: '首页', className: 'tab-home' },
        { action: 'my', label: '我的', className: 'tab-my' }
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
      const action = event.currentTarget.dataset.action;
      const routes = {
        full: '/pages/full-report/index',
        analyzing: '/pages/analysis/index',
        home: '/pages/index/index',
        my: '/pages/my/index'
      };
      if (routes[action]) navigate(routes[action]);
    }
  });
} else {
  const { resolveOrderRoute } = require('../../utils/navigation');
  const { createMiniappApiClient } = require('../../services/api-client');
  const { seedMyFixtureIfMissing } = require('../my');

  const REPORTS_ROUTE = '/pages/reports/index';
  const WRONG_QUESTION_ROUTE = '/pages/wrong-question/index';
  const AI_TUTOR_ROUTE = '/pages/ai-tutor/index';

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
      openReportCard(orderId, optionsForOpen = {}) {
        if (!response) page.loadReports();
        const item = response.body.items.find((entry) => entry.orderId === orderId);
        const enriched = item ? enrichReportItem(client, item) : null;
        const resumeTarget = enriched ? resolveResumeTarget(enriched, optionsForOpen.resume) : null;
        return {
          status: item ? 'NAVIGATE' : 'NOT_FOUND',
          orderId,
          targetRoute: resumeTarget ? resumeTarget.targetRoute : null,
          query: resumeTarget ? resumeTarget.query : null,
          resumeMode: resumeTarget ? resumeTarget.resumeMode : null,
          aiTutor: enriched ? enriched.aiTutor : null,
          disabledReason: item ? null : '报告不存在'
        };
      },
      getState(filter = options.filter || 'all') {
        if (!response) page.loadReports(filter);
        return createStateFromItems(response.body.items.map((item) => enrichReportItem(client, item)), { filter, apiStatus: response.status });
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
        savedReport: Boolean(item.savedReport),
        aiTutor: item.aiTutor || null,
        resumeTargets: item.resumeTargets || []
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

  function enrichReportItem(client, item) {
    if (item.accessLevel !== 'full') {
      return {
        ...item,
        aiTutor: {
          formalEntitlement: false,
          statusText: item.accessLevel === 'basic' ? '基础报告未解锁正式 AI 追问' : '未解锁 AI 追问',
          remainingText: '解锁完整报告后可用',
          reportQuota: null,
          questionQuota: null,
          historyCount: 0,
          historyEntry: null
        },
        resumeTargets: [
          { id: 'resume-report-card', targetRoute: resolveOrderRoute(item), query: { orderId: item.orderId }, enabled: true },
          { id: 'resume-ai-tutor-history', targetRoute: resolveOrderRoute(item), enabled: false, disabledReason: 'FULL_REPORT_ENTITLEMENT_REQUIRED' }
        ]
      };
    }

    const questionsResponse = client.request('GET', `/api/diagnosis-orders/${item.orderId}/questions`, {
      source: 'reports-page-ai-tutor-summary'
    });
    const cards = questionsResponse.body.wrongQuestionCards || [];
    const firstQuestion = cards[0] || null;
    const interactionsResponse = firstQuestion
      ? client.request('GET', `/api/diagnosis-orders/${item.orderId}/questions/${firstQuestion.questionId}/interactions`, {
        source: 'reports-page-ai-tutor-history-summary'
      })
      : { body: { items: [] } };
    const reportQuota = questionsResponse.body.reportQuota || { used: 0, total: 10, remaining: 10 };
    const questionQuota = firstQuestion
      ? { used: Math.max(0, 3 - Number(firstQuestion.remainingQuestionQuota || 0)), total: 3, remaining: firstQuestion.remainingQuestionQuota }
      : null;

    return {
      ...item,
      aiTutor: {
        formalEntitlement: true,
        statusText: '完整报告 AI 追问可继续',
        remainingText: `本报告剩余 ${reportQuota.remaining}/${reportQuota.total} 次`,
        reportQuota,
        questionQuota,
        wrongQuestionCount: cards.length,
        historyCount: interactionsResponse.body.items.length,
        firstQuestionId: firstQuestion && firstQuestion.questionId,
        historyEntry: firstQuestion
          ? {
            id: 'resume-ai-tutor-history',
            targetRoute: AI_TUTOR_ROUTE,
            query: { orderId: item.orderId, questionId: firstQuestion.questionId, tab: 'history' },
            latest: interactionsResponse.body.items[0] ? interactionsResponse.body.items[0].summary : null
          }
          : null
      },
      resumeTargets: [
        { id: 'resume-report-card', targetRoute: resolveOrderRoute(item), query: { orderId: item.orderId }, resumeMode: 'report', enabled: true },
        firstQuestion
          ? { id: 'resume-wrong-question', targetRoute: WRONG_QUESTION_ROUTE, query: { orderId: item.orderId, questionId: firstQuestion.questionId }, resumeMode: 'wrongQuestion', enabled: true }
          : { id: 'resume-wrong-question', targetRoute: resolveOrderRoute(item), query: { orderId: item.orderId }, resumeMode: 'wrongQuestion', enabled: false },
        firstQuestion
          ? { id: 'resume-ai-tutor-history', targetRoute: AI_TUTOR_ROUTE, query: { orderId: item.orderId, questionId: firstQuestion.questionId, tab: 'history' }, resumeMode: 'history', enabled: true }
          : { id: 'resume-ai-tutor-history', targetRoute: resolveOrderRoute(item), query: { orderId: item.orderId }, resumeMode: 'history', enabled: false }
      ]
    };
  }

  function resolveResumeTarget(item, mode = 'report') {
    if (mode === 'wrongQuestion') {
      return item.resumeTargets.find((target) => target.id === 'resume-wrong-question' && target.enabled) || item.resumeTargets[0];
    }
    if (mode === 'history') {
      return item.resumeTargets.find((target) => target.id === 'resume-ai-tutor-history' && target.enabled) || item.resumeTargets[0];
    }
    return item.resumeTargets.find((target) => target.id === 'resume-report-card') || {
      targetRoute: resolveOrderRoute(item),
      query: { orderId: item.orderId },
      resumeMode: 'report'
    };
  }

  module.exports = { REPORTS_ROUTE, createReportsPageState, createStateFromItems, enrichReportItem };
}
