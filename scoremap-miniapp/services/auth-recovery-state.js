function resolveProtectedRouteState({ route, order, payment, reportStatus, authState = 'local-owner' } = {}) {
  if (authState === 'anonymous' && !(order && order.orderToken)) {
    return {
      status: 'UNAUTHENTICATED',
      route,
      targetRoute: '/pages/index/index',
      toast: '请先登录或使用本地订单凭证恢复报告。',
      disabledReason: 'local login or order token required'
    };
  }

  if (!order) {
    return {
      status: 'NOT_FOUND',
      route,
      targetRoute: '/pages/reports/index',
      toast: '未找到本地报告，请重新上传资料。',
      disabledReason: 'order not found'
    };
  }

  const accessLevel = order.accessLevel || 'preview';
  if (route === '/pages/basic-result/index' && !['basic', 'full'].includes(accessLevel)) {
    return {
      status: 'PAYMENT_REQUIRED',
      route,
      targetRoute: '/pages/basic-pay/index',
      toast: '请先完成 1 元本地模拟支付。',
      disabledReason: 'basic entitlement required'
    };
  }

  if ((route === '/pages/full-report-entry/index' || route === '/pages/full-report/index') && accessLevel !== 'full') {
    return {
      status: 'FULL_PAYMENT_REQUIRED',
      route,
      targetRoute: '/pages/full-unlock/index',
      toast: '请先完成 9.9 元本地模拟支付。',
      disabledReason: 'full entitlement required'
    };
  }

  if (payment && payment.status === 'paid' && accessLevel !== paymentExpectedAccess(payment.paymentType)) {
    return {
      status: 'RECOVERY_REQUIRED',
      route,
      targetRoute: route,
      toast: '本地支付已成功，正在恢复报告权限。',
      recoveryAction: 'sync-paid-entitlement'
    };
  }

  if (reportStatus === 'generating' || reportStatus === 'timeout') {
    return {
      status: 'RECOVERABLE_PENDING',
      route,
      targetRoute: '/pages/full-report-entry/index',
      toast: '报告生成中，可稍后刷新继续查看。',
      recoveryAction: 'refresh-report-status'
    };
  }

  return {
    status: 'READY',
    route,
    targetRoute: route,
    toast: null,
    disabledReason: null
  };
}

function mapApiErrorToRecovery(error = {}) {
  const code = error.code || error.statusCode || error.status;
  if (code === 'UNAUTHENTICATED' || code === 401) {
    return { status: 'RECOVERABLE', targetRoute: '/pages/index/index', message: '登录状态已失效，请重新进入。' };
  }
  if (code === 'ORDER_FORBIDDEN' || code === 'EXPORT_FORBIDDEN' || code === 403) {
    return { status: 'RECOVERABLE', targetRoute: '/pages/reports/index', message: '当前账号无权查看该报告。' };
  }
  if (code === 'NOT_FOUND' || code === 404) {
    return { status: 'RECOVERABLE', targetRoute: '/pages/index/index', message: '本地记录不存在，请重新上传。' };
  }
  if (code === 'TEST_SERVER_ERROR' || code === 500) {
    return { status: 'RETRYABLE', targetRoute: null, message: '本地服务异常，请重试。' };
  }
  if (code === 'ANALYSIS_TIMEOUT' || code === 'TIMEOUT' || code === 408) {
    return { status: 'RETRYABLE', targetRoute: null, message: '处理超时，可刷新或稍后查看。' };
  }
  return { status: 'UNKNOWN', targetRoute: null, message: '未知错误，请重试。' };
}

function paymentExpectedAccess(paymentType) {
  return paymentType === 'full' ? 'full' : 'basic';
}

module.exports = {
  mapApiErrorToRecovery,
  resolveProtectedRouteState
};
