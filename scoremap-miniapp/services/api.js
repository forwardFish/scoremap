const config = require('../utils/config');
const storage = require('../utils/storage');

function authHeader(extra = {}) {
  const token = storage.getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

function fullUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${config.API_BASE_URL}${path}`;
}

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: fullUrl(options.url),
      timeout: options.timeout || config.REQUEST_TIMEOUT_MS,
      header: authHeader(options.header || {}),
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        if (response.statusCode === 401) storage.clearLogin();
        reject(new Error((response.data && response.data.message) || `HTTP ${response.statusCode}`));
      },
      fail(error) {
        reject(new Error(error.errMsg || error.message || 'network request failed'));
      }
    });
  });
}

function uploadFile({ url, filePath, name = 'files', formData = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: fullUrl(url),
      filePath,
      name,
      formData,
      header: authHeader(header),
      timeout: config.UPLOAD_TIMEOUT_MS,
      success(response) {
        const data = parseJson(response.data);
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data);
          return;
        }
        if (response.statusCode === 401) storage.clearLogin();
        reject(new Error(data.message || `upload failed: HTTP ${response.statusCode}`));
      },
      fail(error) {
        reject(new Error(error.errMsg || error.message || 'wx.uploadFile failed'));
      }
    });
  });
}

async function loginWechat({ code, userInfo } = {}) {
  const body = { code, userInfo };
  const data = await request({
    method: 'POST',
    url: '/api/auth/wechat-login',
    header: { 'content-type': 'application/json' },
    data: body
  });
  if (data.token) storage.setToken(data.token);
  if (data.user) storage.setUser(data.user);
  return data;
}

function getMe() {
  return request({ method: 'GET', url: '/api/me' });
}

function updateProfile(input = {}) {
  return request({
    method: 'POST',
    url: '/api/me/profile',
    header: { 'content-type': 'application/json' },
    data: input
  });
}

function getMyReports(query = {}) {
  const params = Object.keys(query)
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join('&');
  return request({ method: 'GET', url: `/api/my/reports${params ? `?${params}` : ''}` });
}

async function createDiagnosisOrder(input) {
  const data = await request({
    method: 'POST',
    url: '/api/diagnosis-orders',
    header: { 'content-type': 'application/json' },
    data: input
  });
  if (data.orderId && data.orderToken) {
    storage.setOrderToken(data.orderId, data.orderToken);
  }
  return data;
}

async function uploadDiagnosisFile({ orderId, file, authorizationAccepted = true }) {
  const orderToken = storage.getOrderToken(orderId);
  return uploadFile({
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/uploads`,
    filePath: file.tempFilePath || file.path,
    name: 'files',
    formData: {
      authorizationAccepted: authorizationAccepted ? 'true' : 'false',
      uploadId: file.id || '',
      originalName: file.name || ''
    },
    header: orderToken ? { 'x-order-token': orderToken } : {}
  });
}

async function uploadDiagnosisFiles({ orderId, files = [], authorizationAccepted = true }) {
  const results = [];
  for (const file of files) {
    results.push(await uploadDiagnosisFile({ orderId, file, authorizationAccepted }));
  }
  return {
    status: results.length > 0 ? results[results.length - 1].status : 'uploaded',
    orderId,
    uploadedCount: results.length,
    results
  };
}

function startPreviewAnalysis(orderId, input = {}) {
  return request({
    method: 'POST',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/start-preview-analysis`,
    header: orderTokenHeader(orderId),
    data: input
  });
}

function getAnalysisProgress(orderId) {
  return request({
    method: 'GET',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/analysis-progress`,
    header: orderTokenHeader(orderId)
  });
}

function getPreviewDecision(orderId) {
  return request({
    method: 'GET',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/preview-decision`,
    header: orderTokenHeader(orderId)
  });
}

function getBasicDecision(orderId) {
  return request({
    method: 'GET',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/basic-decision`,
    header: orderTokenHeader(orderId)
  });
}

function generateFullReport(orderId, input = {}) {
  return request({
    method: 'POST',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/generate-full`,
    header: { 'content-type': 'application/json', ...orderTokenHeader(orderId) },
    data: input
  });
}

function getFullReport(orderId) {
  return request({
    method: 'GET',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/full-report`,
    header: orderTokenHeader(orderId)
  });
}

function getQuestions(orderId) {
  return request({
    method: 'GET',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/questions`,
    header: orderTokenHeader(orderId)
  });
}

function createQuestionInteraction({ orderId, questionId, actionType, interactionId }) {
  return request({
    method: 'POST',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/questions/${encodeURIComponent(questionId)}/interactions`,
    header: { 'content-type': 'application/json', ...orderTokenHeader(orderId) },
    data: { actionType, interactionId }
  });
}

function getQuestionInteractions({ orderId, questionId }) {
  return request({
    method: 'GET',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/questions/${encodeURIComponent(questionId)}/interactions`,
    header: orderTokenHeader(orderId)
  });
}

function submitExerciseAnswer({ orderId, questionId, interactionId, submittedAnswer }) {
  return request({
    method: 'POST',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/questions/${encodeURIComponent(questionId)}/exercise-answer`,
    header: { 'content-type': 'application/json', ...orderTokenHeader(orderId) },
    data: { interactionId, submittedAnswer }
  });
}

function saveReport(orderId) {
  return request({
    method: 'POST',
    url: `/api/reports/${encodeURIComponent(orderId)}/save`,
    header: { 'content-type': 'application/json', ...orderTokenHeader(orderId) },
    data: {}
  });
}

function exportPdf(orderId) {
  return request({
    method: 'POST',
    url: `/api/diagnosis-orders/${encodeURIComponent(orderId)}/export-pdf`,
    header: { 'content-type': 'application/json', ...orderTokenHeader(orderId) },
    data: { exportId: `report-export-${orderId}` }
  });
}

function createPayment({ orderId, paymentType }) {
  return request({
    method: 'POST',
    url: '/api/payments/create',
    header: { 'content-type': 'application/json', ...orderTokenHeader(orderId) },
    data: { orderId, paymentType }
  });
}

async function payForReport({ orderId, paymentType }) {
  const created = await createPayment({ orderId, paymentType });
  if (created.paymentParams && created.paymentParams.provider === 'wechat-pay-jsapi') {
    await requestPayment(created.paymentParams);
    return refreshPaymentUntilSettled(created.paymentId);
  }
  if (created.paymentParams && created.paymentParams.provider === 'local-wechat-pay-mock') {
    return request({
      method: 'POST',
      url: '/api/payments/wechat/callback',
      header: { 'content-type': 'application/json' },
      data: {
        paymentId: created.paymentId,
        status: 'paid',
        mockTransactionId: `local-${Date.now()}`,
        mockSignature: 'local-mock-signature'
      }
    });
  }
  return created;
}

function refreshPayment(paymentId) {
  return request({
    method: 'POST',
    url: '/api/payments/refresh',
    header: { 'content-type': 'application/json' },
    data: { paymentId }
  });
}

async function refreshPaymentUntilSettled(paymentId) {
  let latest = null;
  for (let index = 0; index < config.PAYMENT_REFRESH_RETRIES; index += 1) {
    latest = await refreshPayment(paymentId);
    if (latest.fulfilled) return latest;
    await delay(config.PAYMENT_REFRESH_DELAY_MS);
  }
  return latest || { ok: false, paymentId, fulfilled: false };
}

function requestPayment(paymentParams) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...paymentParams,
      success: resolve,
      fail(error) {
        reject(new Error(error.errMsg || error.message || 'requestPayment failed'));
      }
    });
  });
}

function orderTokenHeader(orderId) {
  const orderToken = storage.getOrderToken(orderId);
  return orderToken ? { 'x-order-token': orderToken } : {};
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

module.exports = {
  createDiagnosisOrder,
  createQuestionInteraction,
  createPayment,
  exportPdf,
  generateFullReport,
  getAnalysisProgress,
  getBasicDecision,
  getFullReport,
  getMyReports,
  getMe,
  getPreviewDecision,
  getQuestionInteractions,
  getQuestions,
  loginWechat,
  payForReport,
  refreshPayment,
  request,
  requestPayment,
  saveReport,
  startPreviewAnalysis,
  submitExerciseAnswer,
  updateProfile,
  uploadDiagnosisFile,
  uploadDiagnosisFiles
};
