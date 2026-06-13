const PREVIEW_ROUTE = '/pages/preview/index';
const BASIC_PAY_ROUTE = '/pages/basic-pay/index';
const BASIC_RESULT_ROUTE = '/pages/basic-result/index';
const REPORTS_ROUTE = '/pages/reports/index';
const LOGIN_ROUTE = '/pages/login/login';

const DEFAULT_PREVIEW = {
  reportTitle: '初一数学月考初判预览',
  summary: '整体基础较稳，计算准确性和几何证明步骤是本次失分的主要来源。',
  visibleModules: [
    { id: 'main-loss-points', title: '主要失分点', summary: '计算符号、进位和几何证明条件遗漏最明显。' },
    { id: 'priority-weakness', title: '优先补弱点', summary: '先补有理数运算，再补辅助线和证明表达。' },
    { id: 'initial-advice', title: '初步建议', summary: '先用 7 天做同类错题复盘和基础纠错。' }
  ],
  lockedModules: [
    { id: 'detailed-cause', title: '详细错因判断' },
    { id: 'seven-day-plan', title: '7 天行动建议' },
    { id: 'next-step', title: '下一步学习建议' }
  ],
  unlockPriceYuan: 1
};

if (typeof Page === 'function') {
  const api = require('../../services/api');
  const auth = require('../../utils/auth');

  Page({
    data: {
      orderId: '',
      preview: DEFAULT_PREVIEW,
      visibleModules: DEFAULT_PREVIEW.visibleModules,
      lockedModules: DEFAULT_PREVIEW.lockedModules,
      hotspots: [],
      reference: '',
      showPayModal: false,
      paying: false,
      errorText: ''
    },

    onLoad(options = {}) {
      const orderId = options.orderId || 'order-v143-c05-preview';
      this.setData({ orderId });
      if (typeof this.loadPreview === 'function') {
        this.loadPreview(orderId);
      }
    },

    async loadPreview(orderId = this.data.orderId) {
      try {
        const response = await api.request({
          method: 'GET',
          url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/preview-decision`
        });
        const preview = normalizePreview(response.decision);
        this.setData({
          preview,
          visibleModules: preview.visibleModules,
          lockedModules: preview.lockedModules,
          errorText: ''
        });
      } catch (error) {
        this.setData({ errorText: error.message || '初判预览加载失败，请稍后重试' });
      }
    },

    onTap(event) {
      const action = event.currentTarget.dataset.action;
      if (action === 'pay') this.openPaymentModal();
      if (action === 'close-pay') this.closePaymentModal();
      if (action === 'confirm-pay') this.confirmPayment();
      if (action === 'reports') this.backToReports();
      if (action === 'back') wx.navigateBack({ delta: 1 });
    },

    noop() {},

    openPaymentModal() {
      if (!auth.requireLogin({ redirectUrl: `${PREVIEW_ROUTE}?orderId=${encodeURIComponent(this.data.orderId)}` })) return;
      this.setData({ showPayModal: true, errorText: '' });
    },

    closePaymentModal() {
      this.setData({ showPayModal: false, paying: false });
    },

    async confirmPayment() {
      if (!auth.requireLogin({ redirectUrl: `${PREVIEW_ROUTE}?orderId=${encodeURIComponent(this.data.orderId)}` })) return;
      this.setData({ paying: true, errorText: '' });
      try {
        await api.payForReport({ orderId: this.data.orderId, paymentType: 'basic' });
        wx.navigateTo({ url: `${BASIC_RESULT_ROUTE}?orderId=${encodeURIComponent(this.data.orderId)}` });
      } catch (error) {
        this.setData({ errorText: error.message || '本地支付确认失败，请重试' });
      } finally {
        this.setData({ paying: false });
      }
    },

    backToReports() {
      if (!auth.requireLogin({ redirectUrl: `${PREVIEW_ROUTE}?orderId=${encodeURIComponent(this.data.orderId)}` })) return;
      wx.navigateTo({ url: REPORTS_ROUTE });
    }
  });
} else {
  const { createMiniappApiClient } = require('../../services/api-client');

  function createPreviewPageState(client = createMiniappApiClient(), options = {}) {
    const orderId = options.orderId || 'order-v143-c05-preview';
    let preview = options.preview || null;
    let showPayModal = false;
    let toast = null;
    seedPreviewIfMissing(client, orderId, options.preview);

    const page = {
      route: PREVIEW_ROUTE,
      orderId,
      uiReference: {
        id: 'UI143-C05',
        png: 'docs/UI/小程序/v1.4.3-C05-初判预览-1元半屏支付.png'
      },
      title: '初判报告预览',
      controls: [
        { id: 'unlock-basic', text: '立即支付 1 元解锁完整初判', run: () => page.openPaymentModal() },
        { id: 'back-to-reports', text: '稍后查看', run: () => page.backToReports() }
      ],
      loadPreview() {
        const response = client.request('GET', `/api/diagnosis-orders/${orderId}/preview-decision`, {
          source: 'v143-c05-preview-load'
        });
        preview = normalizePreview(response.body.decision);
        return {
          status: 'LOADED',
          route: PREVIEW_ROUTE,
          apiId: 'API143-005',
          apiStatus: response.status,
          accessLevel: response.body.accessLevel,
          visibleModuleCount: preview.visibleModules.length,
          lockedModuleCount: preview.lockedModules.length
        };
      },
      getState() {
        if (!preview) page.loadPreview();
        return {
          route: PREVIEW_ROUTE,
          orderId,
          title: page.title,
          uiReference: page.uiReference,
          reportTitle: preview.reportTitle,
          summary: preview.summary,
          visibleModules: preview.visibleModules,
          visibleModuleLimit: 3,
          lockedArea: {
            visible: true,
            copy: '支付后查看完整初判内容',
            modules: preview.lockedModules
          },
          paymentModal: {
            visible: showPayModal,
            type: 'half-screen',
            price: { amountYuan: 1, text: '1 元' },
            title: '确认支付 1 元',
            ctaText: '确认支付并查看完整初判',
            apiIds: ['API143-006', 'API143-007', 'API143-008']
          },
          toast,
          controls: page.controls.map((control) => ({ id: control.id, text: control.text }))
        };
      },
      unlockBasic() {
        return page.openPaymentModal();
      },
      openPaymentModal() {
        if (!isLoggedIn(options)) return loginRequiredResult(PREVIEW_ROUTE, orderId);
        if (!preview) page.loadPreview();
        showPayModal = true;
        toast = '已打开 1 元半屏支付确认';
        return {
          status: 'MODAL_OPEN',
          sourceRoute: PREVIEW_ROUTE,
          targetRoute: BASIC_PAY_ROUTE,
          query: { orderId },
          modal: page.getState().paymentModal,
          ctaText: '确认支付并查看完整初判'
        };
      },
      closePaymentModal() {
        showPayModal = false;
        return { status: 'MODAL_CLOSED', sourceRoute: PREVIEW_ROUTE };
      },
      confirmBasicPayment() {
        if (!isLoggedIn(options)) return loginRequiredResult(PREVIEW_ROUTE, orderId);
        if (!showPayModal) page.openPaymentModal();
        const mockPaymentStatus = options.mockPaymentStatus || 'paid';
        const create = client.request('POST', '/api/payments/create', {
          orderId,
          paymentType: 'basic',
          amountYuan: 1,
          source: 'v143-c05-half-screen-payment'
        });
        const callback = client.request('POST', '/api/payments/wechat/callback', {
          paymentId: create.body.paymentId,
          status: mockPaymentStatus,
          mockTransactionId: `local-mock-basic-${orderId}`,
          mockSignature: 'local-mock-signature',
          source: 'v143-c05-half-screen-payment'
        });
        if (callback.body.status !== 'paid') {
          const orderBeforeFailure = client.store.read('diagnosis_orders', orderId);
          client.store.upsert('diagnosis_orders', {
            ...orderBeforeFailure,
            id: orderId,
            accessLevel: 'preview',
            status: 'preview_done'
          });
          const payment = client.store.read('payments', create.body.paymentId);
          toast = '本地支付未完成，仍停留在初判预览';
          return {
            status: 'PAYMENT_FAILED',
            sourceRoute: PREVIEW_ROUTE,
            targetRoute: PREVIEW_ROUTE,
            query: { orderId },
            paymentId: create.body.paymentId,
            paymentCreateStatus: create.status,
            callbackStatus: callback.status,
            callbackPaymentStatus: callback.body.status,
            accessLevel: 'preview',
            paymentReadback: payment,
            orderReadback: client.store.read('diagnosis_orders', orderId),
            toast
          };
        }
        const basicDecision = client.request('GET', `/api/diagnosis-orders/${orderId}/basic-decision`, {
          source: 'v143-c05-paid-basic-readback'
        });
        const order = client.store.read('diagnosis_orders', orderId);
        const payment = client.store.read('payments', create.body.paymentId);
        showPayModal = false;
        toast = '1 元完整初判已解锁';
        return {
          status: callback.body.status === 'paid' ? 'PAID' : 'PAYMENT_PENDING',
          sourceRoute: PREVIEW_ROUTE,
          targetRoute: BASIC_RESULT_ROUTE,
          query: { orderId },
          paymentId: create.body.paymentId,
          paymentCreateStatus: create.status,
          callbackStatus: callback.status,
          basicDecisionStatus: basicDecision.status,
          accessLevel: order.accessLevel,
          paymentReadback: payment,
          orderReadback: order,
          toast
        };
      },
      backToReports() {
        if (!isLoggedIn(options)) return loginRequiredResult(PREVIEW_ROUTE, orderId);
        const response = client.request('GET', '/api/my/reports', { source: 'v143-c05-later-view', orderId });
        toast = '已保存到我的报告，可稍后继续解锁完整初判';
        return {
          status: 'NAVIGATE',
          targetRoute: REPORTS_ROUTE,
          reportsCount: response.body.items.length,
          toast
        };
      }
    };

    return page;
  }

  function isLoggedIn(options = {}) {
    return options.loggedIn !== false;
  }

  function loginRequiredResult(redirectRoute, orderId) {
    return {
      status: 'LOGIN_REQUIRED',
      loginRequired: true,
      targetRoute: LOGIN_ROUTE,
      redirectUrl: `${redirectRoute}?orderId=${encodeURIComponent(orderId)}`,
      toast: '请先完成微信登录后再继续'
    };
  }

  function seedPreviewIfMissing(client, orderId, preview = DEFAULT_PREVIEW) {
    if (!client.store.read('diagnosis_orders', orderId)) {
      client.store.upsert('diagnosis_orders', {
        id: orderId,
        ownerId: 'local-user-scoremap-t06',
        status: 'preview_done',
        accessLevel: 'preview',
        source: 'V143-11-c05-preview'
      });
    }
    const decisionId = `decision-${orderId}-preview`;
    if (!client.store.read('diagnosis_decisions', decisionId)) {
      client.store.upsert('diagnosis_decisions', {
        id: decisionId,
        orderId,
        ownerId: 'local-user-scoremap-t06',
        level: 'preview',
        preview
      });
    }
  }

  module.exports = { DEFAULT_PREVIEW, createPreviewPageState };
}

function normalizePreview(decision = DEFAULT_PREVIEW) {
  const source = decision || DEFAULT_PREVIEW;
  const visibleModules = Array.isArray(source.visibleModules)
    ? source.visibleModules.slice(0, 3)
    : DEFAULT_PREVIEW.visibleModules;
  return {
    ...DEFAULT_PREVIEW,
    ...source,
    visibleModules,
    lockedModules: Array.isArray(source.lockedModules) ? source.lockedModules : DEFAULT_PREVIEW.lockedModules,
    unlockPriceYuan: source.unlockPriceYuan || 1
  };
}
