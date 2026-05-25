const BASIC_AMOUNT_CENTS = 100;
const FULL_AMOUNT_CENTS = 990;

function accessLevelForPaymentType(paymentType) {
  if (paymentType === 'basic') return 'basic';
  if (paymentType === 'full') return 'full';
  throw new Error(`Unsupported local payment type: ${paymentType}.`);
}

function amountForPaymentType(paymentType) {
  return paymentType === 'basic' ? BASIC_AMOUNT_CENTS : FULL_AMOUNT_CENTS;
}

class LocalWechatPayMockAdapter {
  constructor({ db }) {
    this.db = db;
    this.remoteCalls = [];
  }

  assertLocalOnly() {
    return {
      status: 'PASS',
      adapter: 'local-wechat-pay-mock',
      remoteCalls: this.remoteCalls.slice(),
      supportedStatuses: ['paid', 'failed', 'cancelled']
    };
  }

  createPayment({ paymentId, orderId, ownerId, paymentType }) {
    const order = this.db.read('diagnosis_orders', orderId);
    if (!order) {
      throw new Error(`Cannot create local payment for missing order: ${orderId}.`);
    }
    if (order.ownerId !== ownerId) {
      throw new Error('Cannot create local payment for a different owner.');
    }
    const existing = this.db.read('payments', paymentId);
    if (existing) {
      return {
        payment: existing,
        paymentParams: this.buildPaymentParams(existing),
        idempotent: true
      };
    }
    const payment = this.db.insert('payments', {
      id: paymentId,
      orderId,
      ownerId,
      paymentType,
      channel: 'local-wechat-pay-mock',
      amountCents: amountForPaymentType(paymentType),
      status: 'pending',
      mockTransactionId: null,
      callbackCount: 0
    });
    return {
      payment,
      paymentParams: this.buildPaymentParams(payment),
      idempotent: false
    };
  }

  handleCallback({ paymentId, status, mockTransactionId }) {
    const payment = this.db.read('payments', paymentId);
    if (!payment) {
      throw new Error(`Cannot callback missing local payment: ${paymentId}.`);
    }
    if (payment.status === status && payment.mockTransactionId === mockTransactionId) {
      return {
        payment,
        order: this.db.read('diagnosis_orders', payment.orderId),
        idempotent: true
      };
    }
    const nextPayment = this.db.update('payments', paymentId, {
      status,
      mockTransactionId: mockTransactionId || payment.mockTransactionId,
      callbackCount: Number(payment.callbackCount || 0) + 1,
      paidAt: status === 'paid' ? new Date(0).toISOString() : payment.paidAt || null
    });
    const patch = status === 'paid'
      ? {
          accessLevel: accessLevelForPaymentType(payment.paymentType),
          status: `${payment.paymentType}_paid`
        }
      : {
          status: `payment_${status}`
        };
    const order = this.db.update('diagnosis_orders', payment.orderId, patch);
    return { payment: nextPayment, order, idempotent: false };
  }

  buildPaymentParams(payment) {
    return {
      provider: 'local-wechat-pay-mock',
      paymentId: payment.id,
      orderId: payment.orderId,
      amountCents: payment.amountCents,
      nonceStr: `local-nonce-${payment.id}`,
      package: `prepay_id=local_${payment.id}`,
      signType: 'LOCAL_MOCK',
      paySign: `local-signature-${payment.id}`
    };
  }
}

module.exports = {
  BASIC_AMOUNT_CENTS,
  FULL_AMOUNT_CENTS,
  LocalWechatPayMockAdapter
};
