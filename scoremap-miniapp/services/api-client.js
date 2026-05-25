const nodePath = require('node:path');
const { writeLocalPdf } = require('../../server/src/report/local-pdf');
const { createLocalFixtureStore } = require('./local-fixture-store');

const LOCAL_OWNER_ID = 'local-user-scoremap-t06';

function createMiniappApiClient(options = {}) {
  const store = options.store || createLocalFixtureStore();
  const calls = [];

  function record(method, path, payload, responseStatus, responseBody) {
    calls.push({ method, path, payloadSummary: summarize(payload), responseStatus, responseBody });
    return { status: responseStatus, body: responseBody };
  }

  return {
    calls,
    store,
    request(method, path, payload = {}) {
      if (!path.startsWith('/api/')) {
        throw new Error(`Miniapp API client only accepts local API paths: ${path}`);
      }

      if (method === 'POST' && path === '/api/diagnosis-orders') {
        const orderId = payload.orderId || 'order-t06-shell';
        store.upsert('diagnosis_orders', {
          id: orderId,
          ownerId: LOCAL_OWNER_ID,
          status: 'created',
          accessLevel: 'preview',
          source: payload.source || 'T06-miniapp-shell'
        });
        return record(method, path, payload, 201, { status: 'created', orderId, orderToken: `local-order-token-${orderId}` });
      }

      const orderPath = path.match(/^\/api\/diagnosis-orders\/([^/]+)\/([^/]+)$/);
      if (orderPath) {
        return handleOrderAction({ method, path, payload, orderId: orderPath[1], action: orderPath[2], store, record });
      }

      if (method === 'POST' && path === '/api/payments/create') {
        const paymentId = payload.paymentId || `payment-t06-${payload.paymentType || 'basic'}`;
        const paymentType = payload.paymentType || 'basic';
        store.upsert('payments', {
          id: paymentId,
          orderId: payload.orderId,
          ownerId: LOCAL_OWNER_ID,
          paymentType,
          amountYuan: Number.isFinite(payload.amountYuan) ? payload.amountYuan : paymentType === 'full' ? 9.9 : 1,
          status: 'paid',
          adapter: 'local-wechat-pay-mock'
        });
        const accessLevel = paymentType === 'full' ? 'full' : 'basic';
        store.upsert('diagnosis_orders', { ...store.read('diagnosis_orders', payload.orderId), id: payload.orderId, accessLevel });
        if (paymentType === 'basic') {
          upsertBasicDecision(store, payload.orderId);
        }
        return record(method, path, payload, 201, { status: 'paid', paymentId, amountYuan: paymentType === 'full' ? 9.9 : 1, paymentParams: { adapter: 'local-mock' } });
      }

      if (method === 'POST' && path === '/api/payments/wechat/callback') {
        const payment = store.read('payments', payload.paymentId);
        if (!payment) {
          return record(method, path, payload, 404, { status: 'error', code: 'PAYMENT_NOT_FOUND' });
        }
        const nextStatus = payload.status || 'paid';
        store.upsert('payments', {
          ...payment,
          status: nextStatus,
          mockTransactionId: payload.mockTransactionId || `local-mock-${payload.paymentId}`,
          callbackAdapter: 'local-wechat-pay-mock'
        });
        if (nextStatus === 'paid') {
          const accessLevel = payment.paymentType === 'full' ? 'full' : 'basic';
          store.upsert('diagnosis_orders', { ...store.read('diagnosis_orders', payment.orderId), id: payment.orderId, accessLevel });
          if (payment.paymentType === 'basic') {
            upsertBasicDecision(store, payment.orderId);
          }
        }
        return record(method, path, payload, 200, { ok: true, status: nextStatus, paymentId: payload.paymentId });
      }

      if (method === 'GET' && path === '/api/my/reports') {
        const payments = store.list('payments');
        return record(method, path, payload, 200, {
          status: 'ok',
          items: store.list('diagnosis_orders').map((order) => ({
            orderId: order.id,
            title: order.title || buildReportTitle(order),
            grade: order.grade || 'Grade 5',
            subject: order.subject || 'Math',
            examType: order.examType || 'Unit test',
            status: order.status,
            accessLevel: order.accessLevel,
            createdAt: order.createdAt || '2026-05-22T10:00:00Z',
            savedReport: Boolean(order.savedReport),
            paymentStatus: getPaymentStatus(payments, order.id),
            paidAmountYuan: payments
              .filter((payment) => payment.orderId === order.id && payment.status === 'paid')
              .reduce((sum, payment) => sum + (Number(payment.amountYuan) || 0), 0)
          }))
        });
      }

      return record(method, path, payload, 404, { status: 'error', code: 'NOT_FOUND' });
    }
  };
}

function handleOrderAction({ method, path, payload, orderId, action, store, record }) {
  const order = store.read('diagnosis_orders', orderId) || { id: orderId, ownerId: LOCAL_OWNER_ID, status: 'created', accessLevel: 'preview' };
  if (method === 'POST' && action === 'uploads') {
    const uploadId = payload.uploadId || 'upload-t06-shell';
    store.upsert('upload_files', {
      id: uploadId,
      orderId,
      ownerId: LOCAL_OWNER_ID,
      authorizationAccepted: payload.authorizationAccepted === true,
      localOnly: true
    });
    store.upsert('diagnosis_orders', { ...order, status: 'uploaded', uploadedCount: 1 });
    return record(method, path, payload, 200, { status: 'uploaded', orderId, uploadedCount: 1 });
  }

  if (method === 'POST' && action === 'start-preview-analysis') {
    const taskId = payload.taskId || 'task-t06-preview';
    const existingTask = store.read('ai_analysis_tasks', taskId);
    const status = payload.forceStatus || (payload.retry ? 'analyzing' : 'preview_done');
    const progress = Number.isFinite(payload.progress)
      ? payload.progress
      : status === 'preview_done'
        ? 100
        : status === 'preview_failed' || status === 'failed'
          ? 0
          : 10;
    store.upsert('ai_analysis_tasks', {
      ...existingTask,
      id: taskId,
      orderId,
      ownerId: LOCAL_OWNER_ID,
      type: 'preview',
      status,
      progress,
      currentStep: payload.currentStep || (status === 'preview_done' ? 'preview_ready' : 'reading_material'),
      errorCode: payload.errorCode || null,
      retryCount: (existingTask && existingTask.retryCount ? existingTask.retryCount : 0) + (payload.retry ? 1 : 0)
    });
    if (status === 'preview_done') {
      store.upsert('diagnosis_decisions', {
        id: `decision-${orderId}-preview`,
        orderId,
        ownerId: LOCAL_OWNER_ID,
        level: 'preview',
        preview: { visibleModules: ['overview', 'loss-points', 'advice'], lockedModules: ['full-report'] }
      });
    }
    store.upsert('diagnosis_orders', { ...order, status });
    return record(method, path, payload, 200, { status, taskId });
  }

  if (method === 'GET' && action === 'analysis-progress') {
    const task = store.list('ai_analysis_tasks').find((item) => item.orderId === orderId);
    return record(method, path, payload, 200, {
      status: task ? task.status : order.status,
      progress: task ? task.progress : 0,
      currentStep: task ? task.currentStep : 'waiting_upload',
      steps: buildAnalysisSteps(task),
      errorCode: task ? task.errorCode : null
    });
  }

  if (method === 'GET' && action === 'preview-decision') {
    return record(method, path, payload, 200, { status: 'preview_done', accessLevel: order.accessLevel, decision: store.read('diagnosis_decisions', `decision-${orderId}-preview`).preview });
  }

  if (method === 'GET' && action === 'basic-decision') {
    const currentOrder = store.read('diagnosis_orders', orderId) || order;
    if (!['basic', 'full'].includes(currentOrder.accessLevel)) {
      return record(method, path, payload, 403, { status: 'error', code: 'BASIC_PAYMENT_REQUIRED' });
    }
    upsertBasicDecision(store, orderId);
    return record(method, path, payload, 200, { status: 'ok', decision: store.read('diagnosis_decisions', `decision-${orderId}-basic`).basic });
  }

  if (method === 'POST' && action === 'generate-full') {
    store.upsert('ai_analysis_tasks', { id: 'task-t06-full', orderId, ownerId: LOCAL_OWNER_ID, type: 'full', status: 'full_done' });
    store.upsert('diagnosis_decisions', {
      id: `decision-${orderId}-full`,
      orderId,
      ownerId: LOCAL_OWNER_ID,
      level: 'full',
      full: createFullReportFixture(orderId)
    });
    return record(method, path, payload, 200, { status: 'full_done', taskId: 'task-t06-full' });
  }

  if (method === 'GET' && action === 'full-report') {
    let decision = store.read('diagnosis_decisions', `decision-${orderId}-full`);
    if (!decision) {
      decision = store.upsert('diagnosis_decisions', {
        id: `decision-${orderId}-full`,
        orderId,
        ownerId: LOCAL_OWNER_ID,
        level: 'full',
        full: createFullReportFixture(orderId)
      });
    }
    return record(method, path, payload, 200, { status: 'full_report_ready', decision: decision.full || decision });
  }

  if (method === 'POST' && action === 'save-report') {
    store.upsert('diagnosis_orders', { ...order, savedReport: true });
    return record(method, path, payload, 200, { saved: true });
  }

  if (method === 'POST' && action === 'feedback') {
    const feedbackId = payload.feedbackId || 'feedback-t06-shell';
    store.upsert('feedbacks', {
      id: feedbackId,
      orderId,
      ownerId: LOCAL_OWNER_ID,
      decisionLevel: payload.decisionLevel || 'full',
      rating: payload.rating || 5,
      tags: payload.tags || payload.feedbackTags || [],
      text: payload.text || payload.feedbackText || '',
      source: payload.source || 'miniapp-feedback'
    });
    return record(method, path, payload, 201, { status: 'created', feedbackId });
  }

  if (method === 'POST' && action === 'export-pdf') {
    const exportId = payload.exportId || 'export-t06-shell';
    const report = store.read('diagnosis_decisions', `decision-${orderId}-full`);
    const reportData = report && report.full ? report.full : createFullReportFixture(orderId);
    const relativePath = pathJoin('docs', 'auto-execute', 'evidence', 'frontend-page', 'pdf', `${orderId}-${exportId}.pdf`);
    const filePath = nodePath.resolve(__dirname, '..', '..', relativePath);
    const pdf = writeLocalPdf({
      filePath,
      title: reportData.reportTitle,
      lines: [
        reportData.summary,
        ...reportData.modules.map((module) => `${module.title}: ${module.content}`),
        reportData.complianceNotice
      ]
    });
    store.upsert('report_exports', {
      id: exportId,
      orderId,
      ownerId: LOCAL_OWNER_ID,
      status: 'ready',
      format: pdf.format,
      fileUrl: `local-report-export://${orderId}/${exportId}.pdf`,
      filePath: relativePath,
      byteLength: pdf.byteLength
    });
    return record(method, path, payload, 201, { status: 'ready', exportId, fileUrl: `local-report-export://${orderId}/${exportId}.pdf` });
  }

  return record(method, path, payload, 404, { status: 'error', code: 'NOT_FOUND' });
}

function buildReportTitle(order) {
  if (order.accessLevel === 'full') return 'Complete score improvement report';
  if (order.accessLevel === 'basic') return 'Basic score decision report';
  if (order.status === 'analyzing' || order.status === 'uploaded') return 'Analysis in progress';
  if (order.status === 'failed') return 'Analysis needs retry';
  return 'Score analysis report';
}

function getPaymentStatus(payments, orderId) {
  const orderPayments = payments.filter((payment) => payment.orderId === orderId);
  if (orderPayments.some((payment) => payment.status === 'paid')) return 'paid';
  if (orderPayments.some((payment) => payment.status === 'pending')) return 'pending';
  return 'unpaid';
}

function createFullReportFixture(orderId) {
  return {
    level: 'full',
    reportTitle: 'Complete score improvement report',
    orderId,
    generatedStatus: 'full_report_ready',
    summary: 'Local complete score improvement report for a parent owner review.',
    modules: [
      { id: 'knowledge-diagnosis', title: 'Knowledge diagnosis', content: 'Calculation rules and formula usage need staged practice.' },
      { id: 'loss-point-breakdown', title: 'Per-question loss point breakdown', content: 'Mark the missing condition, formula, solving process, and final verification.' },
      { id: 'seven-day-plan', title: '7-day score improvement plan', content: 'Three correction reviews, two targeted exercise days, and one final mistake-book review.' },
      { id: 'parent-guidance', title: 'Parent guidance', content: 'Use process feedback and avoid guaranteed-score promises.' }
    ],
    tabs: ['overview', 'loss points', '7-day plan', 'parent guidance'],
    complianceNotice: 'Local mock report only. No guaranteed-score promise is displayed.'
  };
}

function pathJoin(...parts) {
  return parts.join('/');
}

function upsertBasicDecision(store, orderId) {
  const decisionId = `decision-${orderId}-basic`;
  if (!store.read('diagnosis_decisions', decisionId)) {
    store.upsert('diagnosis_decisions', {
      id: decisionId,
      orderId,
      ownerId: LOCAL_OWNER_ID,
      level: 'basic',
      basic: {
        level: 'basic',
        summary: '孩子本次主要失分来自计算准确性和几何证明表达。',
        evidenceQuality: 'medium',
        mainLossPoints: ['计算失误', '几何证明步骤不完整'],
        priorityWeaknesses: ['有理数运算', '辅助线思路'],
        initialAdvice: ['每天 15 分钟同类计算纠错', '整理几何证明步骤模板']
      }
    });
  }
  return store.read('diagnosis_decisions', decisionId);
}

function summarize(payload) {
  if (!payload || Object.keys(payload).length === 0) return {};
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, Array.isArray(value) ? `array(${value.length})` : value]));
}

function buildAnalysisSteps(task) {
  const progress = task ? task.progress : 0;
  const failed = task && (task.status === 'preview_failed' || task.status === 'failed');
  return [
    { id: 'read-material', text: 'uploaded material recognized', status: progress >= 10 && !failed ? 'done' : 'pending' },
    { id: 'match-subject', text: 'grade and subject matched', status: progress >= 35 && !failed ? 'done' : 'pending' },
    { id: 'locate-loss-points', text: 'locating score-loss points', status: progress >= 70 && !failed ? 'active' : progress >= 35 && !failed ? 'active' : 'pending' },
    { id: 'generate-preview', text: 'generating preview advice', status: progress >= 100 && !failed ? 'done' : failed ? 'failed' : 'pending' }
  ];
}

module.exports = { LOCAL_OWNER_ID, createMiniappApiClient };
