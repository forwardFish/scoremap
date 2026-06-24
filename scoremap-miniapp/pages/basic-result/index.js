const BASIC_RESULT_ROUTE = '/pages/basic-result/index';
const FULL_UNLOCK_ROUTE = '/pages/full-unlock/index';
const FULL_REPORT_ROUTE = '/pages/full-report/index';
const LOGIN_ROUTE = '/pages/login/login';

function fallbackBasicDecision() {
  return {
    level: 'basic',
    summary: '整体基础较好，计算粗心和几何证明是本次失分的主要原因。',
    evidenceQuality: 'medium',
    quality: {
      uploadQuality: 'normal',
      confidence: 0.86,
      recognized: true
    },
    mainLossPoints: ['计算失误、几何证明'],
    priorityWeaknesses: ['优先提升几何证明能力'],
    answerQuality: '基础题较稳，步骤规范性一般',
    initialAdvice: ['先修复高频错因，再看完整建议'],
    lockedModules: [
      '详细丢分点分析',
      '优先补弱顺序',
      '7天行动建议',
      '完整学习建议',
      '关键错题修复 / 同类题练习入口'
    ]
  };
}

if (typeof Page === 'function') {
  const api = require('../../services/api');
  const { requireLogin } = require('../../utils/auth');

  Page({
    data: initialRuntimeData(),

    onLoad(query = {}) {
      const orderId = query.orderId || '';
      this.setData({ orderId });
      hideNativeTabBar();
      this.loadBasicDecision(orderId);
    },

    onShow() {
      hideNativeTabBar();
    },

    onTap(event) {
      const action = event.currentTarget.dataset.action;
      if (action === 'unlock') return this.onUnlockTap();
      if (action === 'close-payment') return this.onClosePayment();
      if (action === 'confirm-payment') return this.onConfirmPayment();
      return null;
    },

    noop() {},

    onBack() {
      wx.navigateBack({
        fail: () => wx.reLaunch({ url: '/pages/index/index' })
      });
    },

    async loadBasicDecision(orderId = this.data.orderId) {
      if (!orderId) {
        this.setData({ decision: fallbackBasicDecision(), loading: false });
        return;
      }
      this.setData({ loading: true });
      try {
        const response = await api.request({
          method: 'GET',
          url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/basic-decision`
        });
        this.setData({
          decision: normalizeDecision(response.decision),
          loading: false,
          loadError: ''
        });
      } catch (error) {
        this.setData({
          decision: fallbackBasicDecision(),
          loading: false,
          loadError: error.message || '基础分析读取失败'
        });
      }
    },

    onUnlockTap() {
      if (!requireLogin({
        redirectUrl: `${BASIC_RESULT_ROUTE}?orderId=${encodeURIComponent(this.data.orderId || '')}`,
        message: '请先完成微信登录后再解锁完整报告'
      })) {
        return;
      }
      this.setData({
        paymentModalVisible: true,
        paymentState: 'idle',
        paymentError: '',
        paymentPrimaryText: '确认支付 9.9元',
        paymentLoading: false
      });
    },

    onClosePayment() {
      if (this.data.paymentState === 'paying') return;
      this.setData({
        paymentModalVisible: false,
        paymentState: 'idle',
        paymentError: '',
        paymentPrimaryText: '确认支付 9.9元',
        paymentLoading: false
      });
    },

    async onConfirmPayment() {
      const orderId = this.data.orderId;
      if (!orderId) {
        this.setData({
          paymentState: 'failed',
          paymentError: '请先完成初步分析',
          paymentPrimaryText: '确认支付 9.9元',
          paymentLoading: false
        });
        return;
      }
      this.setData({
        paymentState: 'paying',
        paymentError: '',
        paymentPrimaryText: '正在支付...',
        paymentLoading: true
      });
      try {
        const payment = await api.payForReport({ orderId, paymentType: 'full' });
        await api.request({
          method: 'POST',
          url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/generate-full`,
          header: { 'content-type': 'application/json' },
          data: { source: 'c07-full-payment' }
        });
        await api.request({
          method: 'GET',
          url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/full-report`
        });
        this.setData({
          paymentState: 'paid',
          paymentModalVisible: false,
          lastPayment: payment,
          paymentPrimaryText: '确认支付 9.9元',
          paymentLoading: false
        });
        wx.navigateTo({
          url: `${FULL_REPORT_ROUTE}?orderId=${encodeURIComponent(orderId)}`,
          fail: () => wx.redirectTo({ url: `${FULL_REPORT_ROUTE}?orderId=${encodeURIComponent(orderId)}` })
        });
      } catch (error) {
        this.setData({
          paymentState: 'failed',
          paymentError: error.message || '支付或报告生成失败，请重试',
          paymentPrimaryText: '确认支付 9.9元',
          paymentLoading: false
        });
      }
    }
  });
} else {
  const { createMiniappApiClient } = require('../../services/api-client');

  function createBasicResultPageState(client = createMiniappApiClient(), options = {}) {
    const orderId = options.orderId || 'order-v143-c07-basic';
    let decisionResponse = null;
    let modalVisible = false;
    let paymentState = 'idle';
    let paymentError = '';
    let lastPaymentResult = null;
    seedBasicFixtureIfMissing(client, orderId);

    const page = {
      route: BASIC_RESULT_ROUTE,
      orderId,
      uiReference: {
        basicResultPng: 'docs/UI/小程序/v1.4.3-C07-完整初判-9.9解锁.png',
        paymentModalPng: 'docs/UI/小程序/v1.4.3-C07-确认9.9支付半屏弹窗.png'
      },
      title: '初步分析报告',
      subtitle: '初一数学月考分析',

      loadBasicDecision() {
        decisionResponse = client.request('GET', `/api/diagnosis-orders/${orderId}/basic-decision`, {
          source: 'c07-basic-result-load'
        });
        return {
          status: decisionResponse.status === 200 ? 'BASIC_READY' : 'BASIC_LOCKED',
          apiStatus: decisionResponse.status,
          decision: decisionResponse.body.decision || null
        };
      },

      showPaymentModal() {
        modalVisible = true;
        paymentState = 'idle';
        paymentError = '';
        return {
          status: 'MODAL_OPEN',
          modal: buildPaymentModal({ visible: modalVisible, paymentState, paymentError })
        };
      },

      unlockFull() {
        modalVisible = true;
        paymentState = 'idle';
        paymentError = '';
        return {
          status: 'MODAL_OPEN',
          sourceRoute: BASIC_RESULT_ROUTE,
          targetRoute: FULL_UNLOCK_ROUTE,
          query: { orderId },
          modal: buildPaymentModal({ visible: modalVisible, paymentState, paymentError })
        };
      },

      cancelPayment() {
        modalVisible = false;
        paymentState = 'idle';
        paymentError = '';
        return {
          status: 'CANCELLED',
          targetRoute: BASIC_RESULT_ROUTE,
          query: { orderId },
          modalVisible
        };
      },

      confirmFullPayment(input = {}) {
        if (input.loggedIn === false) return loginRequiredResult(orderId);
        modalVisible = true;
        paymentState = 'paying';
        paymentError = '';
        const create = client.request('POST', '/api/payments/create', {
          orderId,
          paymentType: 'full',
          amountYuan: 9.9,
          source: 'c07-full-payment'
        });
        if (input.forcePaymentFailure) {
          paymentState = 'failed';
          paymentError = 'LOCAL_PAYMENT_FAILED';
          return failureResult({ orderId, create, paymentError });
        }
        const callback = client.request('POST', '/api/payments/wechat/callback', {
          paymentId: create.body.paymentId,
          status: 'paid',
          mockTransactionId: `local-mock-c07-full-${orderId}`
        });
        if (callback.status !== 200 || callback.body.status !== 'paid') {
          paymentState = 'failed';
          paymentError = callback.body.code || 'PAYMENT_CALLBACK_FAILED';
          return failureResult({ orderId, create, callback, paymentError });
        }
        const generateFull = client.request('POST', `/api/diagnosis-orders/${orderId}/generate-full`, {
          source: 'c07-full-payment'
        });
        if (input.forceGenerateFailure) {
          paymentState = 'failed';
          paymentError = 'LOCAL_FULL_GENERATION_FAILED';
          return failureResult({ orderId, create, callback, generateFull, paymentError });
        }
        const fullReport = client.request('GET', `/api/diagnosis-orders/${orderId}/full-report`, {
          source: 'c07-route-readback'
        });
        const payment = client.store.read('payments', create.body.paymentId);
        const order = client.store.read('diagnosis_orders', orderId);
        const fullDecision = client.store.read('diagnosis_decisions', `decision-${orderId}-full`);
        modalVisible = false;
        paymentState = 'paid';
        lastPaymentResult = {
          status: 'PAID',
          targetRoute: FULL_REPORT_ROUTE,
          query: { orderId },
          paymentId: create.body.paymentId,
          paymentCreateStatus: create.status,
          callbackStatus: callback.status,
          generateFullStatus: generateFull.status,
          fullReportStatus: fullReport.status,
          accessLevel: order.accessLevel,
          paymentReadback: payment,
          orderReadback: order,
          fullDecisionReadback: fullDecision
        };
        return lastPaymentResult;
      },

      getState() {
        if (!decisionResponse) page.loadBasicDecision();
        const decision = normalizeDecision(decisionResponse.body.decision || fallbackBasicDecision());
        return {
          route: BASIC_RESULT_ROUTE,
          orderId,
          title: page.title,
          subtitle: page.subtitle,
          uiReference: page.uiReference,
          hero: {
            title: '初步分析已生成',
            summary: decision.summary,
            statusText: '初步分析已生成'
          },
          basicDecisionFields: {
            mainLossPoints: decision.mainLossPoints,
            priorityWeaknesses: decision.priorityWeaknesses,
            answerQuality: decision.answerQuality,
            initialAdvice: decision.initialAdvice
          },
          lockedReportCard: {
            title: '完整报告解锁后可查看',
            modules: decision.lockedModules
          },
          upgradeCard: {
            visible: true,
            priceText: '9.9元',
            headline: '已完成初判，可立即解锁完整提分报告',
            benefits: ['完整报告', '7天建议', '错题修复'],
            complianceText: '结果基于当前资料分析，仅供学习参考。'
          },
          paymentModal: buildPaymentModal({ visible: modalVisible, paymentState, paymentError }),
          controls: [
            {
              id: 'open-9-9-payment-modal',
              text: '立即支付 9.9元',
              action: 'showPaymentModal'
            },
            {
              id: 'confirm-full-payment',
              text: '确认支付 9.9元',
              api: 'POST /api/payments/create -> POST /api/payments/wechat/callback -> POST /api/diagnosis-orders/{orderId}/generate-full -> GET /api/diagnosis-orders/{orderId}/full-report',
              targetRoute: FULL_REPORT_ROUTE
            },
            {
              id: 'cancel-9-9-payment',
              text: '暂不解锁',
              targetRoute: BASIC_RESULT_ROUTE
            }
          ],
          lastPaymentResult
        };
      }
    };

    return page;
  }

  function seedBasicFixtureIfMissing(client, orderId) {
    if (!client.store.read('diagnosis_orders', orderId)) {
      client.store.upsert('diagnosis_orders', {
        id: orderId,
        ownerId: 'local-user-scoremap-t06',
        status: 'basic_ready',
        accessLevel: 'basic',
        source: 'V143-12-C07-basic-result'
      });
    }
    const decisionId = `decision-${orderId}-basic`;
    if (!client.store.read('diagnosis_decisions', decisionId)) {
      client.store.upsert('diagnosis_decisions', {
        id: decisionId,
        orderId,
        ownerId: 'local-user-scoremap-t06',
        level: 'basic',
        basic: fallbackBasicDecision()
      });
    }
  }

  module.exports = {
    BASIC_RESULT_ROUTE,
    FULL_REPORT_ROUTE,
    createBasicResultPageState,
    fallbackBasicDecision
  };
}

function initialRuntimeData() {
  const decision = fallbackBasicDecision();
  return {
    orderId: '',
    title: '初步分析报告',
    subtitle: '初一数学月考分析',
    loading: true,
    loadError: '',
    decision,
    lockedModules: decision.lockedModules,
    paymentModalVisible: false,
    paymentState: 'idle',
    paymentError: '',
    paymentPrimaryText: '确认支付 9.9元',
    paymentLoading: false,
    lastPayment: null,
    hotspots: [],
    reference: ''
  };
}

function normalizeDecision(decision = {}) {
  const fallback = fallbackBasicDecision();
  return {
    ...fallback,
    ...decision,
    mainLossPoints: normalizeList(decision.mainLossPoints || decision.lossPoints, fallback.mainLossPoints),
    priorityWeaknesses: normalizeList(decision.priorityWeaknesses || decision.weaknesses, fallback.priorityWeaknesses),
    initialAdvice: normalizeList(decision.initialAdvice || decision.advice, fallback.initialAdvice),
    lockedModules: normalizeList(decision.lockedModules, fallback.lockedModules),
    answerQuality: decision.answerQuality || fallback.answerQuality
  };
}

function normalizeList(value, fallback) {
  if (Array.isArray(value) && value.length > 0) return value;
  return fallback;
}

function buildPaymentModal({ visible, paymentState, paymentError }) {
  return {
    visible,
    title: '确认解锁完整报告',
    priceText: '9.9元',
    subtitle: '已完成初判，可立即解锁完整提分报告',
    unlockTitle: '支付后可解锁',
    benefits: [
      '完整报告',
      '7天行动建议',
      '详细丢分点分析',
      '关键错题修复',
      '优先补弱顺序',
      '家长学习建议'
    ],
    primaryText: paymentState === 'paying' ? '正在支付...' : '确认支付 9.9元',
    secondaryText: '暂不解锁',
    state: paymentState,
    error: paymentError
  };
}

function loginRequiredResult(orderId) {
  return {
    status: 'LOGIN_REQUIRED',
    loginRequired: true,
    targetRoute: LOGIN_ROUTE,
    redirectUrl: `${BASIC_RESULT_ROUTE}?orderId=${encodeURIComponent(orderId || '')}`
  };
}

function failureResult({ orderId, create, callback = null, generateFull = null, paymentError }) {
  return {
    status: 'PAYMENT_OR_GENERATION_FAILED',
    targetRoute: BASIC_RESULT_ROUTE,
    retryAction: 'confirmFullPayment',
    query: { orderId },
    paymentCreateStatus: create && create.status,
    callbackStatus: callback && callback.status,
    generateFullStatus: generateFull && generateFull.status,
    errorCode: paymentError
  };
}

function hideNativeTabBar() {
  if (typeof wx !== 'undefined' && wx.hideTabBar) {
    wx.hideTabBar({ animation: false, fail() {} });
  }
}
