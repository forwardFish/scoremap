const crypto = require('node:crypto');
const { BASIC_AMOUNT_CENTS, FULL_AMOUNT_CENTS } = require('../adapters/local-wechat-pay-mock');
const { unauthorized } = require('../middleware/auth');
const { LOCAL_OWNER_ID } = require('./diagnosis-orders-service');

const PAYMENT_TYPES = {
  basic: {
    amountCents: BASIC_AMOUNT_CENTS,
    requiredCurrentAccess: ['preview', 'basic', 'full'],
    nextAccessLevel: 'basic'
  },
  full: {
    amountCents: FULL_AMOUNT_CENTS,
    requiredCurrentAccess: ['basic', 'full'],
    nextAccessLevel: 'full'
  }
};

const CALLBACK_STATUSES = new Set(['paid', 'failed', 'cancelled']);

function createPaymentId(orderId, paymentType) {
  const digest = crypto.createHash('sha1').update(`${orderId}:${paymentType}`).digest('hex').slice(0, 12);
  return `payment-${paymentType}-${digest}`;
}

class PaymentsService {
  constructor({ db, payment }) {
    this.db = db;
    this.payment = payment;
  }

  async createPayment(input = {}, auth = {}) {
    const validation = this.validateCreateInput(input);
    if (validation) return validation;

    const ownerCheck = this.assertOrderAccess(input.orderId, auth);
    if (ownerCheck.error) return ownerCheck.error;

    const entitlement = this.assertCanCreatePayment(ownerCheck.order, input.paymentType);
    if (entitlement) return entitlement;

    const paymentId = input.paymentId || createPaymentId(input.orderId, input.paymentType);
    try {
      const created = await this.payment.createPayment({
        paymentId,
        orderId: input.orderId,
        ownerId: ownerCheck.order.ownerId,
        openid: auth.openid || input.openid || null,
        paymentType: input.paymentType
      });
      const readback = this.db.assertReadback('payments', created.payment.id, {
        status: created.payment.status
      });

      return {
        statusCode: created.idempotent ? 200 : 201,
        body: {
          status: created.payment.status,
          paymentId: created.payment.id,
          orderId: created.payment.orderId,
          paymentType: created.payment.paymentType,
          amountCents: created.payment.amountCents,
          amountYuan: created.payment.amountCents / 100,
          idempotent: created.idempotent,
          paymentParams: created.paymentParams
        },
        readback
      };
    } catch (error) {
      return validationError(error.message);
    }
  }

  handleWechatCallback(input = {}) {
    const validation = this.validateCallbackInput(input);
    if (validation) return validation;
    if (input.mockSignature !== 'local-mock-signature') {
      return {
        statusCode: 403,
        body: { status: 'error', code: 'LOCAL_MOCK_SIGNATURE_REQUIRED' }
      };
    }

    const paymentBefore = this.db.read('payments', input.paymentId);
    if (!paymentBefore) {
      return notFound('Payment not found.');
    }
    if (paymentBefore.channel !== 'local-wechat-pay-mock') {
      return {
        statusCode: 400,
        body: { status: 'error', code: 'VERIFIED_NOTIFY_OR_REFRESH_REQUIRED' }
      };
    }

    const callback = this.payment.handleCallback({
      paymentId: input.paymentId,
      status: input.status,
      mockTransactionId: input.mockTransactionId
    });
    const repaired = input.status === 'paid'
      ? this.ensurePaidEntitlement(callback.payment)
      : { order: callback.order, repaired: false };
    const paymentReadback = this.db.assertReadback('payments', input.paymentId, {
      status: input.status
    });
    const orderReadback = this.db.assertReadback('diagnosis_orders', paymentReadback.orderId, {
      status: repaired.order.status
    });

    return {
      statusCode: 200,
      body: {
        ok: true,
        status: paymentReadback.status,
        paymentId: paymentReadback.id,
        orderId: orderReadback.id,
        accessLevel: orderReadback.accessLevel,
        idempotent: callback.idempotent,
        repaired: repaired.repaired
      },
      readback: {
        payment: paymentReadback,
        order: orderReadback
      }
    };
  }

  async refreshWechatPayment(input = {}, auth = {}) {
    if (!input.paymentId) return validationError('paymentId is required.');
    const payment = this.db.read('payments', input.paymentId);
    if (!payment) return notFound('Payment not found.');
    const ownerCheck = this.assertOrderAccess(payment.orderId, auth);
    if (ownerCheck.error) return ownerCheck.error;
    if (!this.payment.refreshPayment) {
      return validationError('refresh is only available for the env-gated WeChat provider.');
    }
    try {
      const refreshed = await this.payment.refreshPayment({ paymentId: payment.id });
      return {
        statusCode: 200,
        body: {
          ok: true,
          status: refreshed.payment.status,
          paymentId: refreshed.payment.id,
          orderId: refreshed.order && refreshed.order.id,
          accessLevel: refreshed.order && refreshed.order.accessLevel,
          fulfilled: refreshed.fulfilled
        },
        readback: {
          payment: this.db.assertReadback('payments', payment.id, { id: payment.id }),
          order: refreshed.order
        }
      };
    } catch (error) {
      return validationError(error.message);
    }
  }

  async handleWechatNotify({ headers = {}, body = {}, rawBody = '' } = {}) {
    if (!this.payment.handleNotify) {
      return validationError('notify is only available for the env-gated WeChat provider.');
    }
    try {
      const result = await this.payment.handleNotify({ headers, body, rawBody });
      return {
        statusCode: 200,
        body: {
          code: 'SUCCESS',
          message: 'success',
          ignored: result.ignored === true,
          fulfilled: result.fulfilled === true,
          paymentId: result.payment && result.payment.id,
          orderId: result.order && result.order.id
        },
        readback: result.payment
          ? {
              payment: this.db.assertReadback('payments', result.payment.id, { id: result.payment.id }),
              order: result.order
            }
          : null
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: { code: 'FAIL', message: error.message }
      };
    }
  }

  validateCreateInput(input) {
    if (!input.orderId) return validationError('orderId is required.');
    if (!input.paymentType || !PAYMENT_TYPES[input.paymentType]) {
      return validationError('paymentType must be basic or full.');
    }
    return null;
  }

  validateCallbackInput(input) {
    if (!input.paymentId) return validationError('paymentId is required.');
    if (!input.status || !CALLBACK_STATUSES.has(input.status)) {
      return validationError('status must be paid, failed, or cancelled.');
    }
    if (input.status === 'paid' && !input.mockTransactionId) {
      return validationError('mockTransactionId is required for paid callbacks.');
    }
    return null;
  }

  assertOrderAccess(orderId, auth = {}) {
    const order = this.db.read('diagnosis_orders', orderId);
    if (!order) return { error: notFound('Diagnosis order not found.') };
    const ownerId = Object.prototype.hasOwnProperty.call(auth, 'ownerId') ? auth.ownerId : LOCAL_OWNER_ID;
    const token = auth.orderToken || null;
    if (!ownerId && !token) {
      return { error: unauthorized() };
    }
    if (order.ownerId !== ownerId && order.orderToken !== token) {
      return {
        error: {
          statusCode: 403,
          body: { status: 'error', code: 'ORDER_FORBIDDEN' }
        }
      };
    }
    return { order };
  }

  assertCanCreatePayment(order, paymentType) {
    const policy = PAYMENT_TYPES[paymentType];
    if (paymentType === 'full' && order.accessLevel === 'preview') {
      return {
        statusCode: 403,
        body: {
          status: 'error',
          code: 'BASIC_ENTITLEMENT_REQUIRED'
        }
      };
    }
    if (!policy.requiredCurrentAccess.includes(order.accessLevel)) {
      return {
        statusCode: 409,
        body: {
          status: 'error',
          code: 'ENTITLEMENT_STATE_CONFLICT',
          message: `${paymentType} payment is not available from access level ${order.accessLevel}.`
        }
      };
    }
    return null;
  }

  ensurePaidEntitlement(payment) {
    const policy = PAYMENT_TYPES[payment.paymentType];
    const expectedStatus = `${payment.paymentType}_paid`;
    const order = this.db.read('diagnosis_orders', payment.orderId);
    if (!order) {
      return { order: null, repaired: false };
    }
    if (order.accessLevel === policy.nextAccessLevel && order.status === expectedStatus) {
      return { order, repaired: false };
    }
    const repaired = this.db.update('diagnosis_orders', payment.orderId, {
      accessLevel: policy.nextAccessLevel,
      status: expectedStatus
    });
    return { order: repaired, repaired: true };
  }
}

function validationError(message) {
  return {
    statusCode: 400,
    body: { status: 'error', code: 'VALIDATION_ERROR', message }
  };
}

function notFound(message) {
  return {
    statusCode: 404,
    body: { status: 'error', code: 'NOT_FOUND', message }
  };
}

module.exports = {
  CALLBACK_STATUSES,
  PAYMENT_TYPES,
  PaymentsService,
  createPaymentId
};
