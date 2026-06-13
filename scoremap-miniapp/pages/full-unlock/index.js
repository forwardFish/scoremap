if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');

  createReplicaPage({
    title: '解锁完整报告',
    derived: false,
    hotspots: [
      { action: 'pay', label: '支付 9.9 元', className: 'bottom-cta' }
    ],
    actions: {
      pay: { url: '/pages/full-report-entry/index', paymentFlow: true, paymentType: 'full' }
    },
    cards: []
  });
} else {
  const { createMiniappApiClient } = require('../../services/api-client');

  const FULL_UNLOCK_ROUTE = '/pages/full-unlock/index';
  const FULL_REPORT_ENTRY_ROUTE = '/pages/full-report-entry/index';
  const BASIC_RESULT_ROUTE = '/pages/basic-result/index';
  const LOGIN_ROUTE = '/pages/login/login';

  function createFullUnlockPageState(client = createMiniappApiClient(), options = {}) {
    const orderId = options.orderId || 'order-t10-full';
    let toast = null;
    seedFullUnlockFixtureIfMissing(client, orderId);

    const page = {
      route: FULL_UNLOCK_ROUTE,
      orderId,
      uiReference: {
        stitch: 'ui-reference-catalog/小程序/stitch_codex_development_blueprints/_4/screen-reference'
      },
      title: 'Unlock complete analysis',
      subtitle: 'Use the local payment mock to unlock the 9.9 yuan complete report.',
      benefits: [
        'Knowledge-point diagnosis',
        'Per-question loss-point explanation',
        'Seven-day score improvement plan',
        'Parent communication guidance'
      ],
      complianceText: 'Local mock payment only. The page does not promise a guaranteed score.',
      confirmFullPay() {
        if (!isLoggedIn(options)) return loginRequiredResult(FULL_UNLOCK_ROUTE);
        const create = client.request('POST', '/api/payments/create', {
          orderId,
          paymentType: 'full',
          amountYuan: 9.9,
          source: 'full-unlock-confirm'
        });
        const callback = client.request('POST', '/api/payments/wechat/callback', {
          paymentId: create.body.paymentId,
          status: 'paid',
          mockTransactionId: `local-mock-full-${orderId}`
        });
        const generateFull = client.request('POST', `/api/diagnosis-orders/${orderId}/generate-full`, {
          source: 'full-unlock-paid'
        });
        const fullReport = client.request('GET', `/api/diagnosis-orders/${orderId}/full-report`, {
          source: 'full-unlock-readback'
        });
        const payment = client.store.read('payments', create.body.paymentId);
        const order = client.store.read('diagnosis_orders', orderId);
        const fullDecision = client.store.read('diagnosis_decisions', `decision-${orderId}-full`);
        toast = '9.9 yuan local full analysis unlocked.';
        return {
          status: callback.body.status === 'paid' ? 'PAID' : 'PAYMENT_PENDING',
          targetRoute: callback.body.status === 'paid' ? FULL_REPORT_ENTRY_ROUTE : FULL_UNLOCK_ROUTE,
          paymentId: create.body.paymentId,
          paymentCreateStatus: create.status,
          callbackStatus: callback.status,
          generateFullStatus: generateFull.status,
          fullReportStatus: fullReport.status,
          accessLevel: order.accessLevel,
          paymentReadback: payment,
          orderReadback: order,
          fullDecisionReadback: fullDecision,
          toast
        };
      },
      backBasicResult() {
        return {
          status: 'NAVIGATE',
          targetRoute: BASIC_RESULT_ROUTE,
          query: { orderId }
        };
      },
      getState() {
        return {
          route: FULL_UNLOCK_ROUTE,
          orderId,
          title: page.title,
          subtitle: page.subtitle,
          uiReference: page.uiReference,
          entitlementCard: {
            current: 'basic',
            target: 'full',
            priceText: '9.9 yuan',
            text: 'Full analysis entitlement is locked until the local mock payment succeeds.'
          },
          benefits: page.benefits,
          complianceText: page.complianceText,
          controls: [
            {
              id: 'confirm-full-pay',
              text: 'Pay 9.9 yuan with local mock',
              api: 'POST /api/payments/create',
              targetRoute: FULL_REPORT_ENTRY_ROUTE
            },
            {
              id: 'back-basic-result',
              text: 'Back to basic result',
              targetRoute: BASIC_RESULT_ROUTE
            }
          ],
          toast
        };
      }
    };

    return page;
  }

  function isLoggedIn(options = {}) {
    return options.loggedIn !== false;
  }

  function loginRequiredResult(redirectUrl) {
    return {
      status: 'LOGIN_REQUIRED',
      loginRequired: true,
      targetRoute: LOGIN_ROUTE,
      redirectUrl,
      toast: '请先完成微信登录后再继续'
    };
  }

  function seedFullUnlockFixtureIfMissing(client, orderId) {
    if (!client.store.read('diagnosis_orders', orderId)) {
      client.store.upsert('diagnosis_orders', {
        id: orderId,
        ownerId: 'local-user-scoremap-t06',
        status: 'basic_ready',
        accessLevel: 'basic',
        source: 'T10-full-unlock'
      });
    }
    if (!client.store.read('diagnosis_decisions', `decision-${orderId}-basic`)) {
      client.store.upsert('diagnosis_decisions', {
        id: `decision-${orderId}-basic`,
        orderId,
        ownerId: 'local-user-scoremap-t06',
        level: 'basic',
        basic: {
          summary: 'Basic decision fixture for local full unlock.',
          mainLossPoints: ['Calculation accuracy'],
          priorityWeaknesses: ['Geometry proof'],
          initialAdvice: ['Correct similar mistakes daily.']
        }
      });
    }
  }

  module.exports = { FULL_UNLOCK_ROUTE, FULL_REPORT_ENTRY_ROUTE, createFullUnlockPageState };
}
