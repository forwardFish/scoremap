const ANALYSIS_ROUTE = '/pages/analysis/index';
const FAILURE_ROUTE = '/pages/failure/index';
const MY_REPORTS_ROUTE = '/pages/reports/index';
const PREVIEW_ROUTE = '/pages/preview/index';
const FULL_REPORT_ROUTE = '/pages/full-report/index';

const PREVIEW_DONE_STATUSES = new Set(['preview_done', 'review_done']);
const FULL_DONE_STATUSES = new Set(['full_done', 'full_report_ready']);
const FAILED_STATUSES = new Set(['preview_failed', 'failed']);

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_PROGRESS = 68;
const DEFAULT_ORDER_ID = 'order-v143-10-analysis';

const DEFAULT_STEPS = [
  { id: 'read-material', text: '已识别上传资料', status: 'done' },
  { id: 'match-subject', text: '已匹配年级与学科', status: 'done' },
  { id: 'locate-loss-points', text: '正在定位主要丢分点', status: 'active' },
  { id: 'generate-preview', text: '正在生成初步建议', status: 'pending' }
];

function createAnalysisPageState(client = require('../../services/api-client').createMiniappApiClient(), options = {}) {
  const orderId = options.orderId || DEFAULT_ORDER_ID;
  const pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  let lastProgress = normalizeProgress({
    status: 'analyzing',
    progress: DEFAULT_PROGRESS,
    currentStep: 'locate-loss-points',
    steps: DEFAULT_STEPS
  });
  let toast = null;

  const page = {
    route: ANALYSIS_ROUTE,
    orderId,
    uiReference: {
      id: 'UI143-C03',
      png: 'docs/UI/小程序/03-AI分析中.png',
      route: ANALYSIS_ROUTE
    },
    title: 'AI 正在分析中',
    estimateText: '通常需要 10-30 秒',
    pollIntervalMs,
    timeoutMs,
    controls: [
      { id: 'later-view', text: '稍后查看', run: () => page.laterView() },
      { id: 'refresh-progress', text: '刷新进度', run: () => page.refreshProgress() }
    ],
    getState() {
      return {
        route: ANALYSIS_ROUTE,
        orderId,
        title: page.title,
        estimateText: page.estimateText,
        progress: lastProgress.progress,
        progressArcDeg: progressToDegrees(lastProgress.progress),
        status: lastProgress.status,
        currentStep: lastProgress.currentStep,
        steps: decorateSteps(lastProgress.steps),
        pollIntervalMs,
        timeoutMs,
        toast,
        controls: page.controls.map((control) => ({ id: control.id, text: control.text })),
        uiReference: page.uiReference
      };
    },
    pollProgress(elapsedMs = 0) {
      return page.loadProgress({ source: 'poll', elapsedMs });
    },
    refreshProgress() {
      return page.loadProgress({ source: 'manual-refresh', elapsedMs: 0 });
    },
    loadProgress({ source, elapsedMs }) {
      const response = client.request('GET', `/api/diagnosis-orders/${orderId}/analysis-progress`, {
        source,
        elapsedMs
      });
      lastProgress = normalizeProgress(response.body);
      toast = null;
      return progressResult(lastProgress, { source, elapsedMs, timeoutMs, pollIntervalMs });
    },
    laterView() {
      const response = client.request('GET', '/api/my/reports', {
        source: 'analysis-later-view',
        orderId
      });
      toast = '已保存到我的报告，可稍后继续查看';
      return {
        status: 'NAVIGATE',
        targetRoute: MY_REPORTS_ROUTE,
        reportsCount: response.body.items.length,
        toast
      };
    }
  };

  return page;
}

function normalizeProgress(body = {}) {
  return {
    status: body.status || 'analyzing',
    progress: clampProgress(body.progress),
    currentStep: body.currentStep || 'locate-loss-points',
    steps: Array.isArray(body.steps) && body.steps.length > 0 ? body.steps : DEFAULT_STEPS,
    errorCode: body.errorCode || null
  };
}

function progressResult(lastProgress, { source, elapsedMs, timeoutMs, pollIntervalMs }) {
  if (PREVIEW_DONE_STATUSES.has(lastProgress.status)) {
    return {
      status: 'READY',
      targetRoute: PREVIEW_ROUTE,
      source,
      progress: lastProgress.progress
    };
  }

  if (FULL_DONE_STATUSES.has(lastProgress.status)) {
    return {
      status: 'FULL_READY',
      targetRoute: FULL_REPORT_ROUTE,
      source,
      progress: lastProgress.progress
    };
  }

  if (FAILED_STATUSES.has(lastProgress.status)) {
    return {
      status: 'FAILED',
      targetRoute: FAILURE_ROUTE,
      source,
      progress: lastProgress.progress,
      errorCode: lastProgress.errorCode || 'ai_failed'
    };
  }

  if (elapsedMs >= timeoutMs) {
    return {
      status: 'TIMEOUT',
      targetRoute: FAILURE_ROUTE,
      source,
      elapsedMs,
      errorCode: 'analysis_timeout'
    };
  }

  if (lastProgress.progress >= 100) {
    return {
      status: 'READY',
      targetRoute: PREVIEW_ROUTE,
      source,
      progress: lastProgress.progress,
      inferredFromProgress: true
    };
  }

  return {
    status: 'PENDING',
    targetRoute: ANALYSIS_ROUTE,
    source,
    nextPollInMs: pollIntervalMs,
    progress: lastProgress.progress
  };
}

function decorateSteps(steps = DEFAULT_STEPS) {
  return steps.map((step) => ({
    ...step,
    nodeIcon: step.status === 'done'
      ? '/assets/icons/analysis-check.png'
      : step.status === 'pending'
        ? '/assets/icons/analysis-clock.png'
        : '',
    nodeText: '',
    nodeClass: step.status === 'active' ? 'spinner' : ''
  }));
}

function clampProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function progressToDegrees(progress) {
  return Math.round((clampProgress(progress) / 100) * 360);
}

if (typeof Page === 'function') {
  const api = require('../../services/api');

  Page({
    data: {
      orderId: '',
      title: 'AI 正在分析中',
      estimateText: '通常需要 10-30 秒',
      progress: DEFAULT_PROGRESS,
      progressArcDeg: progressToDegrees(DEFAULT_PROGRESS),
      steps: decorateSteps(DEFAULT_STEPS),
      refreshing: false,
      toast: ''
    },
    onLoad(query = {}) {
      this.analysisStartedAt = Date.now();
      this.analysisTimer = null;
      const orderId = resolveOrderId(query);
      this.setData({ orderId });
      hideNativeTabBar();
      this.refreshRuntimeProgress('initial');
      this.startAnalysisPolling();
    },
    onShow() {
      hideNativeTabBar();
      this.startAnalysisPolling();
    },
    onHide() {
      this.stopAnalysisPolling();
    },
    onUnload() {
      this.stopAnalysisPolling();
    },
    onTap(event) {
      const action = event.currentTarget.dataset.action;
      if (action === 'back') {
        this.stopAnalysisPolling();
        wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/index/index' }) });
        return;
      }
      if (action === 'later') {
        this.stopAnalysisPolling();
        wx.navigateTo({ url: MY_REPORTS_ROUTE, fail: () => wx.redirectTo({ url: MY_REPORTS_ROUTE }) });
        return;
      }
      if (action === 'refresh') {
        this.refreshRuntimeProgress('manual-refresh');
      }
    },
    startAnalysisPolling() {
      if (this.analysisTimer) return;
      this.analysisTimer = setInterval(() => {
        this.refreshRuntimeProgress('poll');
      }, DEFAULT_POLL_INTERVAL_MS);
    },
    stopAnalysisPolling() {
      if (!this.analysisTimer) return;
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    },
    async refreshRuntimeProgress(source = 'poll') {
      const orderId = this.data.orderId;
      if (!orderId) {
        this.setData({ toast: '未找到分析订单，请重新上传资料' });
        return;
      }
      const elapsedMs = Date.now() - (this.analysisStartedAt || Date.now());
      this.setData({ refreshing: true });
      try {
        const body = await api.getAnalysisProgress(orderId);
        const progress = normalizeProgress(body);
        this.setData({
          progress: progress.progress,
          progressArcDeg: progressToDegrees(progress.progress),
          steps: decorateSteps(progress.steps),
          refreshing: false,
          toast: ''
        });
        const result = progressResult(progress, {
          source,
          elapsedMs,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          pollIntervalMs: DEFAULT_POLL_INTERVAL_MS
        });
        this.handleRuntimeProgressResult(result);
      } catch (error) {
        this.setData({
          refreshing: false,
          toast: error.message || '进度刷新失败'
        });
        if (typeof wx !== 'undefined' && wx.showToast) {
          wx.showToast({ title: error.message || '进度刷新失败', icon: 'none' });
        }
      }
    },
    handleRuntimeProgressResult(result) {
      if (result.status === 'PENDING') return;
      this.stopAnalysisPolling();
      if (result.status === 'READY') {
        navigateWithOrder(PREVIEW_ROUTE, this.data.orderId);
        return;
      }
      if (result.status === 'FULL_READY') {
        navigateWithOrder(FULL_REPORT_ROUTE, this.data.orderId);
        return;
      }
      if (result.status === 'FAILED' || result.status === 'TIMEOUT') {
        navigateWithOrder(FAILURE_ROUTE, this.data.orderId, { errorCode: result.errorCode });
      }
    }
  });
}

function resolveOrderId(query = {}) {
  if (query.orderId) return decodeURIComponent(query.orderId);
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData && app.globalData.scoremapLastOrderId) || '';
}

function navigateWithOrder(route, orderId, extra = {}) {
  const params = {
    ...(orderId ? { orderId } : {}),
    ...extra
  };
  const query = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  const url = query ? `${route}?${query}` : route;
  wx.navigateTo({ url, fail: () => wx.redirectTo({ url }) });
}

function hideNativeTabBar() {
  if (typeof wx !== 'undefined' && wx.hideTabBar) {
    wx.hideTabBar({ animation: false, fail() {} });
  }
}

module.exports = {
  ANALYSIS_ROUTE,
  DEFAULT_STEPS,
  FAILURE_ROUTE,
  FULL_REPORT_ROUTE,
  MY_REPORTS_ROUTE,
  PREVIEW_ROUTE,
  createAnalysisPageState,
  decorateSteps,
  normalizeProgress,
  progressResult,
  progressToDegrees
};
