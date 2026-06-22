const crypto = require('node:crypto');
const { BASIC_AMOUNT_CENTS, FULL_AMOUNT_CENTS } = require('./local-wechat-pay-mock');

const WECHAT_PAY_API_BASE = 'https://api.mch.weixin.qq.com';
const JSAPI_PREPAY_PATH = '/v3/pay/transactions/jsapi';
const OUT_TRADE_NO_QUERY_PATH = '/v3/pay/transactions/out-trade-no';

function baseAmountForPaymentType(paymentType) {
  return paymentType === 'basic' ? BASIC_AMOUNT_CENTS : FULL_AMOUNT_CENTS;
}

function amountForPaymentType(paymentType, env = {}) {
  const baseAmount = baseAmountForPaymentType(paymentType);
  if (env.paymentTestMode && baseAmount > 0) {
    return Math.max(1, Number(env.wechatPayTestAmountCents || 1));
  }
  return baseAmount;
}

function nextAccessLevel(paymentType) {
  if (paymentType === 'basic') return 'basic';
  if (paymentType === 'full') return 'full';
  throw new Error(`Unsupported payment type: ${paymentType}`);
}

function normalizePrivateKey(privateKey = '') {
  return String(privateKey || '').replace(/\\n/g, '\n').trim();
}

function nonce(size = 16) {
  return crypto.randomBytes(size).toString('hex').toUpperCase();
}

function signRsa(message, privateKey) {
  return crypto.createSign('RSA-SHA256').update(message).sign(normalizePrivateKey(privateKey), 'base64');
}

function getHeader(headers = {}, name) {
  return headers[name.toLowerCase()] || headers[name] || '';
}

function normalizeSerial(serial = '') {
  return String(serial || '').replace(/:/g, '').toUpperCase();
}

function assertMerchantCertificate({ cert, privateKey, serialNo }) {
  if (!cert) return;
  let x509;
  try {
    x509 = new crypto.X509Certificate(cert);
  } catch (error) {
    throw new Error(`WECHAT_PAY_MERCHANT_CERT parse failed: ${error.message}`);
  }
  const certSerial = normalizeSerial(x509.serialNumber);
  const configuredSerial = normalizeSerial(serialNo);
  if (certSerial !== configuredSerial) {
    throw new Error(`WECHAT_PAY_SERIAL_NO mismatch: configured ${configuredSerial}, merchant cert ${certSerial}`);
  }
  try {
    const payload = Buffer.from('wechat-pay-merchant-cert-check');
    const signature = crypto.sign('RSA-SHA256', payload, normalizePrivateKey(privateKey));
    const verified = crypto.verify('RSA-SHA256', payload, x509.publicKey, signature);
    if (!verified) throw new Error('private key does not match merchant certificate public key');
  } catch (error) {
    throw new Error(`WECHAT_PAY_PRIVATE_KEY mismatch: ${error.message}`);
  }
}

function decryptAes256Gcm({ apiV3Key, ciphertext, nonce: resourceNonce, associatedData = '' }) {
  const key = Buffer.from(String(apiV3Key || ''), 'utf8');
  if (key.length !== 32) throw new Error('WECHAT_PAY_API_V3_KEY must be 32 bytes.');
  const encrypted = Buffer.from(ciphertext, 'base64');
  const authTag = encrypted.subarray(encrypted.length - 16);
  const data = encrypted.subarray(0, encrypted.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(resourceNonce, 'utf8'));
  decipher.setAuthTag(authTag);
  if (associatedData) decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

class WechatPayProvider {
  constructor({ db, env, fetchImpl = globalThis.fetch } = {}) {
    if (!db) throw new Error('WechatPayProvider requires db.');
    if (!env) throw new Error('WechatPayProvider requires env.');
    this.db = db;
    this.env = env;
    this.fetchImpl = fetchImpl;
    this.remoteCalls = [];
  }

  assertLocalOnly() {
    return {
      status: 'INFO',
      adapter: 'wechat-pay-jsapi',
      remoteCalls: this.remoteCalls.map((call) => ({ method: call.method, path: call.path }))
    };
  }

  async createPayment({ paymentId, orderId, ownerId, openid, paymentType }) {
    this.assertPrepayConfig();
    if (!openid) throw new Error('WeChat openid is required before creating a payment order.');
    const order = this.db.read('diagnosis_orders', orderId);
    if (!order) throw new Error(`Cannot create WeChat payment for missing order: ${orderId}.`);
    if (order.ownerId !== ownerId) throw new Error('Cannot create WeChat payment for a different owner.');

    const existing = this.db.read('payments', paymentId);
    if (existing) {
      return {
        payment: existing,
        paymentParams: existing.paymentParams,
        idempotent: true
      };
    }

    const payment = this.db.insert('payments', {
      id: paymentId,
      orderId,
      ownerId,
      openid,
      paymentType,
      channel: 'wechat-pay-jsapi',
      amountCents: amountForPaymentType(paymentType, this.env),
      expectedAmountCents: baseAmountForPaymentType(paymentType),
      paymentTestMode: this.env.paymentTestMode === true,
      status: 'pending',
      callbackCount: 0,
      transactionId: null,
      outTradeNo: paymentId
    });
    const prepay = await this.createPrepay({ payment });
    const updated = this.db.update('payments', payment.id, {
      prepayId: prepay.prepayId,
      paymentParams: prepay.paymentParams
    });
    return {
      payment: updated,
      paymentParams: prepay.paymentParams,
      idempotent: false
    };
  }

  async createPrepay({ payment }) {
    const body = JSON.stringify({
      appid: this.env.wechatAppId,
      mchid: this.env.wechatPayMchId,
      description: this.env.wechatPayDescription,
      out_trade_no: payment.outTradeNo,
      attach: payment.id,
      notify_url: this.env.wechatPayNotifyUrl,
      amount: {
        total: Number(payment.amountCents),
        currency: 'CNY'
      },
      payer: {
        openid: payment.openid
      }
    });
    const data = await this.requestWechat({
      method: 'POST',
      path: JSAPI_PREPAY_PATH,
      body
    });
    if (!data.prepay_id) throw new Error('WeChat Pay prepay response missing prepay_id.');
    return {
      prepayId: data.prepay_id,
      paymentParams: this.buildRequestPaymentParams(data.prepay_id)
    };
  }

  buildRequestPaymentParams(prepayId) {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = nonce();
    const pkg = `prepay_id=${prepayId}`;
    const paySign = signRsa(`${this.env.wechatAppId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`, this.env.wechatPayPrivateKey);
    return {
      provider: 'wechat-pay-jsapi',
      timeStamp,
      nonceStr,
      package: pkg,
      signType: 'RSA',
      paySign
    };
  }

  async refreshPayment({ paymentId }) {
    this.assertPrepayConfig();
    const payment = this.db.read('payments', paymentId);
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);
    const query = new URLSearchParams({ mchid: this.env.wechatPayMchId }).toString();
    const transaction = await this.requestWechat({
      method: 'GET',
      path: `${OUT_TRADE_NO_QUERY_PATH}/${encodeURIComponent(payment.outTradeNo || payment.id)}?${query}`
    });
    if (transaction.trade_state !== 'SUCCESS') {
      return {
        fulfilled: false,
        payment,
        order: this.db.read('diagnosis_orders', payment.orderId),
        transaction
      };
    }
    return this.markPaidFromTransaction(transaction);
  }

  async handleNotify({ headers, body, rawBody }) {
    if (!this.verifyNotifySignature({ headers, rawBody })) {
      throw new Error('WeChat Pay notify signature verification failed.');
    }
    if (body && body.event_type && body.event_type !== 'TRANSACTION.SUCCESS') {
      return { ignored: true, eventType: body.event_type };
    }
    const transaction = body && body.transaction
      ? body.transaction
      : this.decryptNotifyResource(body.resource || {});
    if (transaction.trade_state !== 'SUCCESS') {
      return { ignored: true, tradeState: transaction.trade_state || '' };
    }
    return this.markPaidFromTransaction(transaction);
  }

  markPaidFromTransaction(transaction) {
    if (transaction.appid !== this.env.wechatAppId || transaction.mchid !== this.env.wechatPayMchId) {
      throw new Error('WeChat Pay transaction appid/mchid mismatch.');
    }
    const payment = this.db.find('payments', (row) => row.outTradeNo === transaction.out_trade_no || row.id === transaction.out_trade_no)[0];
    if (!payment) throw new Error('Payment not found for WeChat transaction.');
    const order = this.db.read('diagnosis_orders', payment.orderId);
    if (!order) throw new Error('Diagnosis order not found for WeChat transaction.');
    const paidAmount = Number(transaction.amount && transaction.amount.total);
    if (paidAmount !== Number(payment.amountCents)) {
      throw new Error(`WeChat Pay amount mismatch: payment ${payment.amountCents}, paid ${paidAmount}.`);
    }
    const payerOpenid = String(transaction.payer && transaction.payer.openid || '');
    if (!payerOpenid || payerOpenid !== payment.openid) {
      throw new Error('WeChat Pay payer openid mismatch.');
    }
    if (payment.status === 'paid' && (!transaction.transaction_id || payment.transactionId === transaction.transaction_id)) {
      return {
        fulfilled: true,
        idempotent: true,
        payment,
        order,
        transaction
      };
    }
    const paidAt = transaction.success_time || new Date().toISOString();
    const nextPayment = this.db.update('payments', payment.id, {
      status: 'paid',
      transactionId: transaction.transaction_id || payment.transactionId || null,
      paidAt,
      callbackCount: Number(payment.callbackCount || 0) + 1,
      notifyPayload: {
        tradeType: transaction.trade_type || '',
        payerOpenid,
        amount: transaction.amount || null
      }
    });
    const nextOrder = this.db.update('diagnosis_orders', order.id, {
      accessLevel: nextAccessLevel(payment.paymentType),
      status: `${payment.paymentType}_paid`
    });
    return {
      fulfilled: true,
      payment: nextPayment,
      order: nextOrder,
      transaction
    };
  }

  verifyNotifySignature({ headers, rawBody }) {
    if (this.env.wechatPaySkipNotifySignature) return true;
    this.assertNotifyConfig();
    const signature = getHeader(headers, 'wechatpay-signature');
    if (String(signature).startsWith('WECHATPAY/SIGNTEST/')) return false;
    const timestamp = getHeader(headers, 'wechatpay-timestamp');
    const nonceStr = getHeader(headers, 'wechatpay-nonce');
    const message = `${timestamp}\n${nonceStr}\n${rawBody || ''}\n`;
    return crypto.createVerify('RSA-SHA256')
      .update(message)
      .verify(this.env.wechatPayPlatformCert, signature, 'base64');
  }

  decryptNotifyResource(resource = {}) {
    if (resource.algorithm !== 'AEAD_AES_256_GCM') {
      throw new Error(`Unsupported WeChat Pay notify algorithm: ${resource.algorithm}`);
    }
    return JSON.parse(decryptAes256Gcm({
      apiV3Key: this.env.wechatPayApiV3Key,
      ciphertext: resource.ciphertext,
      nonce: resource.nonce,
      associatedData: resource.associated_data || ''
    }));
  }

  async requestWechat({ method = 'GET', path, body = '' }) {
    if (typeof this.fetchImpl !== 'function') throw new Error('fetch is not available for WeChat Pay.');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = nonce();
    this.remoteCalls.push({ method, path });
    const response = await this.fetchImpl(`${WECHAT_PAY_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: this.buildAuthorization({ method, path, body, timestamp, nonceStr }),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body } : {})
    });
    const text = await response.text();
    const data = text ? parseJson(text) : {};
    if (!response.ok) {
      throw new Error(data.message || data.raw || `WeChat Pay request failed: HTTP ${response.status}`);
    }
    return data;
  }

  buildAuthorization({ method, path, body, timestamp, nonceStr }) {
    const message = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${body || ''}\n`;
    const signature = signRsa(message, this.env.wechatPayPrivateKey);
    const params = [
      `mchid="${this.env.wechatPayMchId}"`,
      `nonce_str="${nonceStr}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.env.wechatPaySerialNo}"`
    ];
    return `WECHATPAY2-SHA256-RSA2048 ${params.join(',')}`;
  }

  assertPrepayConfig() {
    const missing = [
      ['WECHAT_APP_ID', this.env.wechatAppId],
      ['WECHAT_PAY_MCH_ID', this.env.wechatPayMchId],
      ['WECHAT_PAY_SERIAL_NO', this.env.wechatPaySerialNo],
      ['WECHAT_PAY_PRIVATE_KEY or WECHAT_PAY_PRIVATE_KEY_PATH', this.env.wechatPayPrivateKey],
      ['WECHAT_PAY_NOTIFY_URL', this.env.wechatPayNotifyUrl]
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error(`WeChat Pay config missing: ${missing.join(', ')}`);
    assertMerchantCertificate({
      cert: this.env.wechatPayMerchantCert,
      privateKey: this.env.wechatPayPrivateKey,
      serialNo: this.env.wechatPaySerialNo
    });
  }

  assertNotifyConfig() {
    const missing = [
      ['WECHAT_PAY_API_V3_KEY', this.env.wechatPayApiV3Key],
      ['WECHAT_PAY_PLATFORM_CERT or WECHAT_PAY_PLATFORM_CERT_PATH', this.env.wechatPayPlatformCert]
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error(`WeChat Pay notify config missing: ${missing.join(', ')}`);
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

module.exports = {
  JSAPI_PREPAY_PATH,
  OUT_TRADE_NO_QUERY_PATH,
  WECHAT_PAY_API_BASE,
  WechatPayProvider,
  assertMerchantCertificate,
  baseAmountForPaymentType,
  amountForPaymentType
};
