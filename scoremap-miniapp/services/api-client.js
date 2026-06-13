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
          source: payload.source || 'T06-miniapp-shell',
          grade: payload.grade || null,
          subject: payload.subject || null,
          examType: payload.examType || null,
          currentScore: payload.currentScore || null,
          targetScore: payload.targetScore || null,
          materialTypes: payload.materialTypes || []
        });
        return record(method, path, payload, 201, { status: 'created', orderId, orderToken: `local-order-token-${orderId}` });
      }

      const questionPath = path.match(/^\/api\/diagnosis-orders\/([^/]+)\/questions\/([^/]+)\/([^/]+)$/);
      if (questionPath) {
        return handleQuestionAction({
          method,
          path,
          payload,
          orderId: questionPath[1],
          questionId: questionPath[2],
          action: questionPath[3],
          store,
          record
        });
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

      const saveReportPath = path.match(/^\/api\/reports\/([^/]+)\/save$/);
      if (saveReportPath && method === 'POST') {
        return handleOrderAction({ method, path, payload, orderId: saveReportPath[1], action: 'save-report', store, record });
      }

      if (method === 'POST' && path === '/api/feedbacks') {
        return handleOrderAction({ method, path, payload, orderId: payload.orderId, action: 'feedback', store, record });
      }

      return record(method, path, payload, 404, { status: 'error', code: 'NOT_FOUND' });
    }
  };
}

function handleQuestionAction({ method, path, payload, orderId, questionId, action, store, record }) {
  const question = store.read('diagnosis_questions', questionId);
  if (!question || question.orderId !== orderId) {
    return record(method, path, payload, 404, { status: 'error', code: 'QUESTION_NOT_FOUND' });
  }

  if (method === 'GET' && action === 'interactions') {
    seedTutorHistory(store, orderId, questionId);
    const items = store
      .list('question_interactions')
      .filter((row) => row.orderId === orderId && row.questionId === questionId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return record(method, path, payload, 200, {
      status: 'ok',
      orderId,
      questionId,
      items
    });
  }

  if (method === 'POST' && ['interactions', 'teach-child', 'similar-exercise'].includes(action)) {
    const actionType = normalizeQuestionAction(action, payload.actionType);
    const allowedActions = new Set(['explain_step', 'why_method', 'another_explanation', 'explain_differently', 'simpler_example', 'similar_exercise', 'similar_question', 'generate_similar_exercise', 'mark_understood', 'teach_child']);
    if (!allowedActions.has(actionType)) {
      return record(method, path, payload, 400, { status: 'error', code: 'INVALID_ACTION_TYPE' });
    }
    if (payload.forceQuotaExceeded || Number(question.remainingQuota) <= 0) {
      return record(method, path, payload, 429, { status: 'error', code: 'QUESTION_QUOTA_EXCEEDED' });
    }
    if (payload.forceProviderFailure) {
      return record(method, path, payload, 503, { status: 'error', code: 'LOCAL_AI_PROVIDER_FAILURE' });
    }

    const interactionId = payload.interactionId || `interaction-${questionId}-${actionType}-${store.list('question_interactions').length + 1}`;
    const interaction = store.upsert('question_interactions', {
      id: interactionId,
      orderId,
      questionId,
      ownerId: LOCAL_OWNER_ID,
      actionType,
      promptId: isSimilarExerciseAction(actionType) ? 'LLM-EXERCISE-06' : 'LLM-TUTOR-05',
      status: 'success',
      summary: buildTutorSummary(actionType),
      response: buildTutorResponse(actionType),
      exercise: isSimilarExerciseAction(actionType) ? buildSimilarExercise(questionId) : null,
      traceId: `trace-${interactionId}`,
      createdAt: payload.createdAt || new Date(2026, 4, 25, 9, 0, store.list('question_interactions').length).toISOString()
    });
    store.upsert('ai_model_traces', {
      id: `trace-${interactionId}`,
      traceId: `trace-${interactionId}`,
      promptId: isSimilarExerciseAction(actionType) ? 'LLM-EXERCISE-06' : 'LLM-TUTOR-05',
      adapter: 'local-miniapp-mock',
      status: 'success',
      localOnly: true,
      requestSummary: { orderId, questionId, actionType },
      responseSummary: isSimilarExerciseAction(actionType) ? { exerciseId: interaction.exercise.id } : { summary: interaction.summary }
    });
    store.upsert('diagnosis_questions', {
      ...question,
      remainingQuota: Math.max(0, Number(question.remainingQuota || 0) - 1)
    });
    return record(method, path, payload, 201, {
      status: 'ok',
      interaction,
      quota: {
        questionRemaining: Math.max(0, Number(question.remainingQuota || 0) - 1),
        questionTotal: 3
      }
    });
  }

  if (method === 'POST' && action === 'exercise-answer') {
    const interaction = store.read('question_interactions', payload.interactionId);
    if (!interaction || interaction.orderId !== orderId || interaction.questionId !== questionId || !interaction.exercise) {
      return record(method, path, payload, 404, { status: 'error', code: 'EXERCISE_NOT_FOUND' });
    }
    if (!payload.submittedAnswer) {
      return record(method, path, payload, 400, { status: 'error', code: 'ANSWER_REQUIRED' });
    }
    if (interaction.submittedAnswer) {
      return record(method, path, payload, 409, { status: 'error', code: 'EXERCISE_ALREADY_ANSWERED' });
    }
    const options = interaction.exercise.options || [];
    if (options.length > 0 && !options.includes(payload.submittedAnswer)) {
      return record(method, path, payload, 400, { status: 'error', code: 'INVALID_EXERCISE_OPTION' });
    }
    if (payload.forceProviderFailure) {
      return record(method, path, payload, 503, { status: 'error', code: 'LOCAL_AI_PROVIDER_FAILURE' });
    }
    const correct = payload.submittedAnswer === interaction.exercise.correctOption;
    const traceId = `trace-${interaction.id}-answer`;
    const feedback = {
      correct,
      headline: correct ? '回答正确' : '还差一步',
      explanation: correct
        ? '你先算出每小时多走 12 千米，再乘以 3 小时，数量关系抓对了。'
        : '这类题先比较每小时相差多少，再乘以相同的时间，不要把两个人的速度相加。',
      summary: correct ? '同类题迁移已掌握。' : '需要再练一次速度差乘时间。'
    };
    const updated = store.upsert('question_interactions', {
      ...interaction,
      submittedAnswer: payload.submittedAnswer,
      correctness: correct,
      answerFeedback: feedback,
      answerPromptId: 'LLM-CHECK-07',
      answerTraceId: traceId,
      summary: feedback.summary,
      masteryStatus: correct ? 'initial_mastery' : 'needs_more_practice'
    });
    updateQuestionAndReportMastery(store, orderId, questionId, updated.masteryStatus, updated);
    store.upsert('ai_model_traces', {
      id: traceId,
      traceId,
      promptId: 'LLM-CHECK-07',
      adapter: 'local-miniapp-mock',
      status: 'success',
      localOnly: true,
      requestSummary: { orderId, questionId, interactionId: interaction.id, submittedAnswer: payload.submittedAnswer },
      responseSummary: { correct, summary: feedback.summary }
    });
    return record(method, path, payload, 200, {
      status: payload.checkMastery ? 'mastery_checked' : 'answered',
      interactionId: interaction.id,
      correctness: updated.correctness,
      feedback,
      masteryStatus: updated.masteryStatus
    });
  }

  if (method === 'POST' && action === 'check-mastery') {
    return handleQuestionAction({
      method,
      path,
      payload: { ...payload, checkMastery: true },
      orderId,
      questionId,
      action: 'exercise-answer',
      store,
      record
    });
  }

  return record(method, path, payload, 404, { status: 'error', code: 'NOT_FOUND' });
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

  if (method === 'GET' && action === 'questions') {
    const decision = store.read('diagnosis_decisions', `decision-${orderId}-full`);
    const reportData = decision && decision.full ? decision.full : createFullReportFixture(orderId);
    const cards = reportData.wrongQuestionCards || createWrongQuestionCards(orderId);
    for (const card of cards) {
      store.upsert('diagnosis_questions', {
        id: card.questionId,
        orderId,
        ownerId: LOCAL_OWNER_ID,
        stem: card.stem,
        knowledgePoint: card.knowledgePoint,
        severity: card.severity,
        masteryStatus: card.masteryStatus,
        remainingQuota: card.remainingQuestionQuota
      });
    }
    return record(method, path, payload, 200, {
      status: 'ok',
      orderId,
      reportQuota: reportData.reportQuota,
      wrongQuestionCards: cards
    });
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
    const pdf = writeLocalPdfExport({
      relativePath,
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
    reportTitle: '初一数学月考提分报告',
    orderId,
    generatedStatus: 'full_report_ready',
    summary: '整体基础较好，计算粗心和几何证明步骤不完整是本次失分的主要原因。',
    modules: [
      { id: 'knowledge-diagnosis', title: '主要丢分点', content: '计算失误、几何证明步骤缺失、应用题等量关系不清。' },
      { id: 'loss-point-breakdown', title: '优先补弱顺序', content: '先补几何证明表达，再巩固方程应用题和计算检查。' },
      { id: 'seven-day-plan', title: '7 天建议', content: '每天 20 分钟错题复盘，隔天完成同类题迁移练习。' },
      { id: 'parent-guidance', title: '家长陪伴建议', content: '关注孩子是否能讲清思路，不用分数承诺替代过程反馈。' }
    ],
    tabs: ['overview', 'loss points', '7-day plan', 'parent guidance'],
    reportQuota: {
      used: 2,
      total: 10,
      remaining: 8,
      text: '本报告 AI 错题追问剩余 8/10 次'
    },
    wrongQuestionCards: createWrongQuestionCards(orderId),
    complianceNotice: '内容仅供学习参考，请结合课堂学习与老师建议使用。'
  };
}

function createWrongQuestionCards(orderId) {
  return [
    {
      questionId: `${orderId}-q1`,
      index: 1,
      title: '错题 1 二元一次方程应用题',
      stem: '甲、乙两人同时从 A 地出发，甲每小时行 60km，乙每小时行 50km，3 小时后甲比乙多行多少千米？',
      knowledgePoint: '方程应用题',
      severity: 'high',
      masteryStatus: '未掌握',
      remainingQuestionQuota: 3,
      aiEntryText: '让 AI 老师讲给孩子听'
    },
    {
      questionId: `${orderId}-q2`,
      index: 2,
      title: '错题 2 几何证明题',
      stem: '已知 AB=AC，点 D 在 BC 上且 BD=CD，求证：∠BAD = ∠CAD。',
      knowledgePoint: '几何证明',
      severity: 'medium',
      masteryStatus: '中等',
      remainingQuestionQuota: 2,
      aiEntryText: '让 AI 老师讲给孩子听'
    }
  ];
}

function pathJoin(...parts) {
  return parts.join('/');
}

function writeLocalPdfExport({ relativePath, title, lines }) {
  if (typeof wx !== 'undefined') {
    return {
      filePath: relativePath,
      byteLength: 0,
      format: 'application/pdf',
      deferred: true
    };
  }

  const nodePath = require('node:path');
  const { writeLocalPdf } = require('../../server/src/report/local-pdf');
  return writeLocalPdf({
    filePath: nodePath.resolve(__dirname, '..', '..', relativePath),
    title,
    lines
  });
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
  const done = task && ['preview_done', 'review_done', 'full_done', 'full_report_ready'].includes(task.status);
  return [
    { id: 'read-material', text: 'uploaded material recognized', status: progress >= 10 && !failed ? 'done' : 'pending' },
    { id: 'match-subject', text: 'grade and subject matched', status: progress >= 35 && !failed ? 'done' : 'pending' },
    { id: 'locate-loss-points', text: 'locating score-loss points', status: done || (progress >= 70 && !failed) ? 'done' : progress >= 35 && !failed ? 'active' : 'pending' },
    { id: 'generate-preview', text: done ? 'analysis result ready' : 'generating preview advice', status: done ? 'done' : failed ? 'failed' : 'pending' }
  ];
}

function seedTutorHistory(store, orderId, questionId) {
  const existing = store.list('question_interactions').filter((row) => row.orderId === orderId && row.questionId === questionId);
  if (existing.length > 0) return;
  store.upsert('question_interactions', {
    id: `${questionId}-history-1`,
    orderId,
    questionId,
    ownerId: LOCAL_OWNER_ID,
    actionType: 'explain_step',
    promptId: 'LLM-TUTOR-05',
    status: 'success',
    summary: '先看速度差，再乘以时间。',
    response: '这一步是在求甲每小时比乙多走多少，再用速度差乘以 2 小时。',
    traceId: `trace-${questionId}-history-1`,
    createdAt: '2026-05-25T08:00:01.000Z'
  });
  store.upsert('question_interactions', {
    id: `${questionId}-history-2`,
    orderId,
    questionId,
    ownerId: LOCAL_OWNER_ID,
    actionType: 'why_method',
    promptId: 'LLM-TUTOR-05',
    status: 'success',
    summary: '解释为什么用速度差。',
    response: '两人同时出发、时间相同，比较多走的路程就看每小时多走多少。',
    traceId: `trace-${questionId}-history-2`,
    createdAt: '2026-05-25T08:00:02.000Z'
  });
}

function buildTutorSummary(actionType) {
  const summaries = {
    explain_step: '拆解关键步骤：速度差乘以时间。',
    why_method: '解释方法依据：同时间比较路程差。',
    another_explanation: '换一种讲法：先算每小时领先多少。',
    similar_exercise: '生成同类练习题。',
    mark_understood: '学生标记已经理解。'
  };
  return summaries[actionType] || 'AI 老师围绕当前错题完成讲解。';
}

function buildTutorResponse(actionType) {
  const responses = {
    explain_step: '60 - 50 表示甲每小时比乙多走 10 千米，再乘 2 小时就是 20 千米。',
    why_method: '因为题目问“多行多少”，不是两人一共行多少，所以要先做减法。',
    another_explanation: '可以把它想成每过 1 小时甲领先 10 千米，过 2 小时就领先 2 个 10 千米。',
    similar_exercise: '已生成一道同类题，继续保持当前错题的数量关系。',
    mark_understood: '已记录理解状态，后续可以在报告里查看这道题的互动记录。'
  };
  return responses[actionType] || responses.explain_step;
}

function buildSimilarExercise(questionId) {
  return {
    id: `exercise-${questionId}`,
    stem: '甲每小时行 72km，乙每小时行 60km，3 小时后甲比乙多行多少千米？',
    options: ['24 千米', '36 千米', '132 千米', '216 千米'],
    correctOption: '36 \u5343\u7c73'
  };
}

function normalizeQuestionAction(pathAction, actionType) {
  if (pathAction === 'teach-child') return actionType || 'teach_child';
  if (pathAction === 'similar-exercise') return 'similar_exercise';
  return actionType;
}

function isSimilarExerciseAction(actionType) {
  return ['similar_exercise', 'similar_question', 'generate_similar_exercise'].includes(actionType);
}

function updateQuestionAndReportMastery(store, orderId, questionId, masteryStatus, interaction) {
  const question = store.read('diagnosis_questions', questionId);
  if (question) {
    store.upsert('diagnosis_questions', {
      ...question,
      masteryStatus,
      latestInteractionId: interaction.id,
      latestInteractionSummary: interaction.summary
    });
  }

  const decision = store.read('diagnosis_decisions', `decision-${orderId}-full`);
  if (!decision || !decision.full || !Array.isArray(decision.full.wrongQuestionCards)) return;
  const wrongQuestionCards = decision.full.wrongQuestionCards.map((card) => {
    if (card.questionId !== questionId && card.id !== questionId) return card;
    return {
      ...card,
      masteryStatus,
      latestHistory: interaction.summary,
      latestInteractionId: interaction.id,
      interactionCount: (Number(card.interactionCount) || 0) + 1
    };
  });
  store.upsert('diagnosis_decisions', {
    ...decision,
    full: {
      ...decision.full,
      wrongQuestionCards
    }
  });
}

module.exports = { LOCAL_OWNER_ID, createMiniappApiClient };
